import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import type {
  DeviceConfigResponse,
  DeviceHeartbeatInput,
  HeartbeatResponse,
  PairDeviceInput,
  PairDeviceResponse,
} from '@yallego/contracts';

import { PrismaService, type ScopedClient } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { DeviceContext } from '../../shared/guards/device-token.guard';
import { TokenService } from '../auth/token.service';
import { DevicesService } from './devices.service';
import { canonicalizePairingCode } from './pairing-code.util';

const HEARTBEAT_INTERVAL_SECONDS = 5 * 60;
const INGEST_BATCH_SIZE = 50;

@Injectable()
export class DeviceGatewayService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(MailerService) private readonly mailer: MailerService,
  ) {}

  async pairDevice(input: PairDeviceInput): Promise<PairDeviceResponse> {
    const codeHash = this.tokenService.hashOpaqueToken(canonicalizePairingCode(input.code));

    const result = await this.prisma.withoutTenantScope(async (tx) => {
      const pairingCode = await tx.pairingCode.findUnique({
        where: { codeHash },
        include: { tenant: true },
      });

      if (
        !pairingCode ||
        pairingCode.usedAt ||
        pairingCode.expiresAt <= new Date() ||
        pairingCode.tenant.status !== TenantStatus.ACTIVE
      ) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'El código de vinculación no es válido o ya expiró.',
        );
      }

      await this.devicesService.assertWithinDeviceLimit(tx, pairingCode.tenantId);

      const deviceToken = this.tokenService.createOpaqueToken('dvt');
      const tokenHash = this.tokenService.hashOpaqueToken(deviceToken);
      const label =
        pairingCode.label ??
        ([input.device.manufacturer, input.device.model].filter(Boolean).join(' ') ||
          'Dispositivo sin nombre');

      const device = await tx.device.create({
        data: {
          tenantId: pairingCode.tenantId,
          tokenHash,
          label,
          manufacturer: input.device.manufacturer,
          model: input.device.model,
          osVersion: input.device.os_version,
          appVersion: input.device.app_version,
        },
      });

      const consumed = await tx.pairingCode.updateMany({
        where: { id: pairingCode.id, usedAt: null },
        data: { usedAt: new Date(), deviceId: device.id },
      });
      if (consumed.count !== 1) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'El código de vinculación ya fue utilizado.',
        );
      }

      await tx.auditEvent.create({
        data: {
          tenantId: pairingCode.tenantId,
          action: 'devices.paired',
          actorType: 'DEVICE',
          resourceType: 'device',
          resourceId: device.id,
        },
      });

      return { device, tenant: pairingCode.tenant, deviceToken };
    });

    const monitoredPackages = await this.prisma.withoutTenantScope((tx) =>
      getMonitoredPackages(tx, result.tenant.id),
    );

    return {
      device_id: result.device.id,
      device_token: result.deviceToken,
      tenant: { id: result.tenant.id, business_name: result.tenant.businessName },
      monitored_packages: monitoredPackages,
    };
  }

  async heartbeat(device: DeviceContext, input: DeviceHeartbeatInput): Promise<HeartbeatResponse> {
    const updated = await this.prisma.withoutTenantScope((tx) =>
      tx.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          ...(input.app_version ? { appVersion: input.app_version } : {}),
        },
      }),
    );

    if (updated.offlineNotifiedAt) {
      await this.notifyRecovery(updated.tenantId, updated.id);
    }

    const [monitoredPackages, configVersion] = await this.prisma.withoutTenantScope((tx) =>
      Promise.all([
        getMonitoredPackages(tx, device.tenantId),
        getConfigVersion(tx, device.tenantId),
      ]),
    );

    return {
      server_time: new Date().toISOString(),
      monitored_packages: monitoredPackages,
      config_version: configVersion,
    };
  }

  async getConfig(device: DeviceContext): Promise<DeviceConfigResponse> {
    const [monitoredPackages, configVersion] = await this.prisma.withoutTenantScope((tx) =>
      Promise.all([
        getMonitoredPackages(tx, device.tenantId),
        getConfigVersion(tx, device.tenantId),
      ]),
    );

    return {
      monitored_packages: monitoredPackages,
      heartbeat_interval_seconds: HEARTBEAT_INTERVAL_SECONDS,
      ingest_batch_size: INGEST_BATCH_SIZE,
      config_version: configVersion,
    };
  }

  private async notifyRecovery(tenantId: string, deviceId: string): Promise<void> {
    await this.prisma.withoutTenantScope(async (tx) => {
      const cleared = await tx.device.updateMany({
        where: { id: deviceId, offlineNotifiedAt: { not: null } },
        data: { offlineNotifiedAt: null },
      });
      if (cleared.count !== 1) return;

      const [device, tenant, recipients] = await Promise.all([
        tx.device.findUniqueOrThrow({ where: { id: deviceId } }),
        tx.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
        tx.membership.findMany({
          where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
          include: { user: true },
        }),
      ]);

      await Promise.all(
        recipients.map((membership) =>
          this.mailer.sendDeviceRecoveredEmail({
            email: membership.user.email,
            fullName: membership.user.fullName,
            deviceLabel: device.label,
            businessName: tenant.businessName,
          }),
        ),
      );
    });
  }
}

/** Paquetes de las billeteras que el tenant activó; el dispositivo solo debe escuchar esos. */
async function getMonitoredPackages(tx: ScopedClient, tenantId: string): Promise<string[]> {
  const tenantWallets = await tx.tenantWallet.findMany({
    where: { tenantId, isEnabled: true },
    include: { wallet: true },
  });
  return tenantWallets.map((tenantWallet) => tenantWallet.wallet.androidPackage);
}

/**
 * No hay una tabla de versiones de configuración: se deriva del momento del
 * cambio más reciente en las billeteras activas, que es lo único que hoy
 * afecta la configuración que ve el dispositivo.
 */
async function getConfigVersion(tx: ScopedClient, tenantId: string): Promise<number> {
  const latest = await tx.tenantWallet.findFirst({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });
  return Math.floor((latest?.updatedAt.getTime() ?? 0) / 1_000);
}
