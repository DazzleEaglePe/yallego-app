import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DeviceStatus, SubscriptionStatus } from '@prisma/client';
import type {
  CreatePairingCodeInput,
  DeviceSummary,
  PairingCodeResponse,
  UpdateDeviceInput,
} from '@yallego/contracts';

import { PrismaService, type ScopedClient } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { TenantContext, TenantResourceContext } from '../../shared/guards/tenant.guard';
import { TokenService } from '../auth/token.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { canonicalizePairingCode, generatePairingCode } from './pairing-code.util';

const PAIRING_CODE_TTL_MS = 10 * 60 * 1_000;
const OFFLINE_THRESHOLD_MS = 15 * 60 * 1_000;

@Injectable()
export class DevicesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
  ) {}

  async listDevices(tenant: TenantResourceContext): Promise<DeviceSummary[]> {
    const devices = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.device.findMany({ where: { tenantId: tenant.id }, orderBy: { pairedAt: 'asc' } }),
    );
    return devices.map(mapDevice);
  }

  async getDevice(tenant: TenantResourceContext, deviceId: string): Promise<DeviceSummary> {
    const device = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.device.findUnique({ where: { id: deviceId } }),
    );
    if (!device || device.tenantId !== tenant.id) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El dispositivo no existe.');
    }
    return mapDevice(device);
  }

  async createPairingCode(
    tenant: TenantContext,
    actorUserId: string,
    input: CreatePairingCodeInput,
  ): Promise<PairingCodeResponse> {
    return this.prisma.withTenant(tenant.id, async (tx) => {
      await this.assertWithinDeviceLimit(tx, tenant.id);

      const code = generatePairingCode();
      const codeHash = this.tokenService.hashOpaqueToken(canonicalizePairingCode(code));
      const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

      await tx.pairingCode.create({
        data: {
          tenantId: tenant.id,
          codeHash,
          label: input.label,
          createdBy: actorUserId,
          expiresAt,
        },
      });
      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'devices.pairing_code_created',
          actorType: 'USER',
          actorUserId,
        },
      });

      return {
        code,
        qr_payload: `yallego://pair?code=${code}`,
        expires_at: expiresAt.toISOString(),
      };
    });
  }

  async updateDevice(
    tenant: TenantContext,
    actorUserId: string,
    deviceId: string,
    input: UpdateDeviceInput,
  ): Promise<DeviceSummary> {
    return this.prisma.withTenant(tenant.id, async (tx) => {
      const existing = await tx.device.findUnique({ where: { id: deviceId } });
      if (!existing || existing.tenantId !== tenant.id) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El dispositivo no existe.');
      }
      if (existing.status === DeviceStatus.REVOKED) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'Un dispositivo revocado no puede modificarse.',
        );
      }

      const updated = await tx.device.update({
        where: { id: deviceId },
        data: {
          ...(input.label !== undefined ? { label: input.label } : {}),
          ...(input.status !== undefined ? { status: input.status as DeviceStatus } : {}),
        },
      });

      if (input.status !== undefined && input.status !== existing.status) {
        await tx.auditEvent.create({
          data: {
            tenantId: tenant.id,
            action: input.status === DeviceStatus.PAUSED ? 'devices.paused' : 'devices.resumed',
            actorType: 'USER',
            actorUserId,
            resourceType: 'device',
            resourceId: deviceId,
          },
        });
      }

      return mapDevice(updated);
    });
  }

  async revokeDevice(tenant: TenantContext, actorUserId: string, deviceId: string): Promise<void> {
    await this.prisma.withTenant(tenant.id, async (tx) => {
      const existing = await tx.device.findUnique({ where: { id: deviceId } });
      if (!existing || existing.tenantId !== tenant.id) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El dispositivo no existe.');
      }

      await tx.device.update({ where: { id: deviceId }, data: { status: DeviceStatus.REVOKED } });
      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'devices.revoked',
          actorType: 'USER',
          actorUserId,
          resourceType: 'device',
          resourceId: deviceId,
        },
      });
    });
  }

  /** Reutilizado por el gateway interno al confirmar la vinculación (chequeo autoritativo). */
  async assertWithinDeviceLimit(tx: ScopedClient, tenantId: string): Promise<void> {
    const [subscription, activeCount] = await Promise.all([
      tx.subscription.findFirst({
        where: { tenantId, status: SubscriptionStatus.ACTIVE },
        orderBy: { periodStart: 'desc' },
        include: { plan: true },
      }),
      tx.device.count({ where: { tenantId, status: { not: DeviceStatus.REVOKED } } }),
    ]);

    const limits = (subscription?.plan.limits as { devices?: number } | undefined) ?? {};
    this.planLimits.assertWithin(
      limits,
      'devices',
      activeCount,
      'Se alcanzó el límite de dispositivos del plan actual.',
    );
  }
}

function mapDevice(device: {
  id: string;
  label: string;
  manufacturer: string | null;
  model: string | null;
  osVersion: string | null;
  appVersion: string | null;
  status: DeviceStatus;
  lastSeenAt: Date | null;
  pairedAt: Date;
}): DeviceSummary {
  const isOnline = device.lastSeenAt
    ? Date.now() - device.lastSeenAt.getTime() < OFFLINE_THRESHOLD_MS
    : false;

  return {
    id: device.id,
    label: device.label,
    manufacturer: device.manufacturer,
    model: device.model,
    os_version: device.osVersion,
    app_version: device.appVersion,
    status: device.status,
    connectivity: isOnline ? 'ONLINE' : 'OFFLINE',
    last_seen_at: device.lastSeenAt?.toISOString() ?? null,
    paired_at: device.pairedAt.toISOString(),
  };
}
