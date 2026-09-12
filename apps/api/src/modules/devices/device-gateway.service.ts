import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createPublicKey, verify } from 'node:crypto';
import { TenantStatus, TrialIdentityKind, UsageWindowType } from '@prisma/client';
import type {
  DeviceConfigResponse,
  DeviceHeartbeatInput,
  DeviceMobileOverviewResponse,
  HeartbeatResponse,
  PairDeviceInput,
  PairDeviceResponse,
} from '@yallego/contracts';

import { EncryptionService } from '../../infrastructure/crypto/encryption.service';
import { PrismaService, type ScopedClient } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { DeviceContext } from '../../shared/guards/device-token.guard';
import { TokenService } from '../auth/token.service';
import { EntitlementService } from '../plans/entitlement.service';
import { CURRENT_SUBSCRIPTION_STATUSES, type PlanLimits } from '../plans/plan-limits.service';
import { DevicesService } from './devices.service';
import { canonicalizePairingCode } from './pairing-code.util';
import { TrialIdentityRolloutService } from './trial-identity-rollout.service';

const HEARTBEAT_INTERVAL_SECONDS = 2 * 60;
const INGEST_BATCH_SIZE = 50;

@Injectable()
export class DeviceGatewayService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(MailerService) private readonly mailer: MailerService,
    @Inject(EncryptionService) private readonly cipher: EncryptionService,
    @Inject(EntitlementService) private readonly entitlementService: EntitlementService,
    @Inject(TrialIdentityRolloutService)
    private readonly identityRollout: TrialIdentityRolloutService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
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
      await this.claimTrialIdentities(tx, pairingCode.tenantId, input);

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
          // Las señales entran ya solo durante pairing y se persisten como
          // HMAC: ni el GUID, ANDROID_ID ni la clave pública quedan en claro.
          installationIdHash: input.identity
            ? this.hashIdentitySignal(input.identity.installation_id)
            : null,
          androidIdHash: input.identity ? this.hashIdentitySignal(input.identity.android_id) : null,
          publicKeyThumbprint: input.identity
            ? this.hashIdentitySignal(input.identity.public_key)
            : null,
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

  private assertIdentitySignature(input: PairDeviceInput): void {
    if (!input.identity) return;
    try {
      const publicKey = createPublicKey({
        key: Buffer.from(input.identity.public_key, 'base64'),
        format: 'der',
        type: 'spki',
      });
      const payload = Buffer.from(
        [
          'v1',
          input.code,
          input.identity.installation_id,
          input.identity.android_id,
          input.identity.public_key,
          input.device.manufacturer ?? '',
          input.device.model ?? '',
          input.device.os_version ?? '',
          input.device.app_version ?? '',
        ].join('\n'),
        'utf8',
      );
      const valid = verify(
        'sha256',
        payload,
        publicKey,
        Buffer.from(input.identity.request_signature, 'base64'),
      );
      if (!valid) throw new Error('invalid signature');
    } catch {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'DEVICE_INTEGRITY_REQUIRED',
        'No pudimos validar la identidad de este dispositivo.',
      );
    }
  }

  private hashIdentitySignal(value: string): string {
    return `v1:${this.tokenService.hashOpaqueToken(value)}`;
  }

  /** Reclama señales solo para tenants en trial. Un reclamo propio permite reinstalar;
   * uno de otro tenant evita que un correo nuevo consiga un segundo trial. */
  private async claimTrialIdentities(
    tx: ScopedClient,
    tenantId: string,
    input: PairDeviceInput,
  ): Promise<void> {
    const mode = this.identityRollout.modeFor(tenantId);
    if (mode === 'OFF') return;

    // El control ant-abuso solo pertenece al alta de un trial. Una cuenta que
    // ya paga no puede quedar bloqueada por un cliente Android antiguo.
    const subscription = await tx.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
    if (subscription?.plan.code !== 'TRIAL') return;

    const identity = input.identity;
    if (!identity) {
      this.metrics.trialIdentityPairingsTotal.inc({ mode, outcome: 'missing_identity' });
      if (mode === 'ENFORCE') {
        throw new ApiHttpException(
          HttpStatus.FORBIDDEN,
          'DEVICE_INTEGRITY_REQUIRED',
          'Actualiza la aplicación para validar la identidad de este dispositivo.',
        );
      }
      return;
    }
    try {
      this.assertIdentitySignature(input);
    } catch (error) {
      this.metrics.trialIdentityPairingsTotal.inc({ mode, outcome: 'invalid_signature' });
      throw error;
    }

    const signals: Array<{ kind: TrialIdentityKind; valueHash: string }> = [
      {
        kind: TrialIdentityKind.ANDROID_ID,
        valueHash: this.hashIdentitySignal(identity.android_id),
      },
      {
        kind: TrialIdentityKind.INSTALLATION_KEY,
        valueHash: this.hashIdentitySignal(identity.public_key),
      },
    ];
    const [androidSignal, keySignal] = signals;
    const inserted = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "trial_identity_claims" ("kind", "value_hash", "tenant_id")
      VALUES
        (${androidSignal!.kind}::"trial_identity_kind", ${androidSignal!.valueHash}, ${tenantId}::uuid),
        (${keySignal!.kind}::"trial_identity_kind", ${keySignal!.valueHash}, ${tenantId}::uuid)
      ON CONFLICT ("kind", "value_hash") DO NOTHING
      RETURNING "id"
    `;
    if (inserted.length === signals.length) {
      this.metrics.trialIdentityPairingsTotal.inc({ mode, outcome: 'accepted' });
      return;
    }

    const existing = await tx.trialIdentityClaim.findMany({
      where: { OR: signals },
    });
    const conflicting = existing.filter((claim) => claim.tenantId !== tenantId);
    if (conflicting.length > 0 && mode === 'ENFORCE') {
      this.metrics.trialIdentityPairingsTotal.inc({ mode, outcome: 'reuse_rejected' });
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'TRIAL_ALREADY_USED',
        'No podemos habilitar otra prueba gratuita para esta cuenta.',
      );
    }
    if (conflicting.length > 0) {
      // No conservar la otra señal si solo una chocó: una observación nunca
      // debe crear propiedad parcial que bloquee después al tenant legítimo.
      if (inserted.length > 0) {
        await tx.trialIdentityClaim.deleteMany({
          where: { id: { in: inserted.map((claim) => claim.id) } },
        });
      }
      await Promise.all(
        conflicting.map((claim) =>
          tx.auditEvent.create({
            data: {
              tenantId,
              action: 'trial.identity_reuse_observed',
              actorType: 'DEVICE',
              resourceType: 'trial_identity_claim',
              resourceId: claim.id,
              metadata: { kind: claim.kind },
            },
          }),
        ),
      );
      this.metrics.trialIdentityPairingsTotal.inc({ mode, outcome: 'reuse_observed' });
      return;
    }

    const ownExistingIds = existing
      .filter((claim) => !inserted.some((created) => created.id === claim.id))
      .map((claim) => claim.id);
    if (ownExistingIds.length > 0) {
      await tx.trialIdentityClaim.updateMany({
        where: { id: { in: ownExistingIds } },
        data: { lastSeenAt: new Date() },
      });
    }
    this.metrics.trialIdentityPairingsTotal.inc({ mode, outcome: 'accepted' });
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

  async getMobileOverview(device: DeviceContext): Promise<DeviceMobileOverviewResponse> {
    return this.prisma.withoutTenantScope(async (tx) => {
      const [tenant, currentDevice, wallets, subscription, recentActivity] = await Promise.all([
        tx.tenant.findUniqueOrThrow({ where: { id: device.tenantId } }),
        tx.device.findUniqueOrThrow({ where: { id: device.id } }),
        tx.tenantWallet.findMany({
          where: { tenantId: device.tenantId, isEnabled: true },
          include: { wallet: true },
          orderBy: { enabledAt: 'asc' },
        }),
        tx.subscription.findFirst({
          where: { tenantId: device.tenantId, status: { in: CURRENT_SUBSCRIPTION_STATUSES } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        }),
        tx.transaction.findMany({
          where: { tenantId: device.tenantId, deviceId: device.id },
          include: { wallet: true },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: 20,
        }),
      ]);

      const usage = subscription
        ? await tx.usagePeriod.findUnique({
            where: {
              tenantId_periodStart: {
                tenantId: device.tenantId,
                periodStart: subscription.periodStart,
              },
            },
          })
        : null;
      const limits = subscription?.plan.limits as PlanLimits | undefined;
      const isTrial = subscription?.plan.code === 'TRIAL';
      const trialWindow = isTrial
        ? this.entitlementService.resolveDayWindow(tenant.timezone, new Date())
        : null;
      const [trialDayUsage, trialTotalUsage] =
        isTrial && subscription && trialWindow
          ? await Promise.all([
              tx.usageBucket.findFirst({
                where: {
                  tenantId: device.tenantId,
                  windowType: UsageWindowType.DAY,
                  windowStart: trialWindow.start,
                },
              }),
              tx.usageBucket.findFirst({
                where: {
                  tenantId: device.tenantId,
                  windowType: UsageWindowType.SUBSCRIPTION_PERIOD,
                  windowStart: subscription.createdAt,
                },
              }),
            ])
          : [null, null];

      return {
        tenant: { id: tenant.id, business_name: tenant.businessName },
        device: { id: currentDevice.id, label: currentDevice.label },
        wallets: wallets.map(({ wallet }) => ({
          code: wallet.code,
          display_name: wallet.displayName,
        })),
        subscription: subscription
          ? {
              plan_code: subscription.plan.code,
              plan_name: subscription.plan.displayName,
              status: subscription.status,
              access_state: subscription.status,
              period_end: subscription.periodEnd.toISOString(),
              transactions_used: usage?.transactionsCount ?? 0,
              transactions_limit: limits?.transactions_per_month ?? -1,
              trial:
                isTrial && trialWindow
                  ? {
                      ends_at: subscription.trialEndsAt?.toISOString() ?? null,
                      transactions_today: trialDayUsage?.used ?? 0,
                      transactions_total: trialTotalUsage?.used ?? 0,
                      daily_reset_at: trialWindow.end.toISOString(),
                    }
                  : null,
            }
          : null,
        recent_activity: recentActivity.map((transaction) => ({
          id: transaction.id,
          wallet: {
            code: transaction.wallet.code,
            display_name: transaction.wallet.displayName,
          },
          sender_name: transaction.senderNameEncrypted
            ? this.cipher.decrypt(transaction.senderNameEncrypted)
            : null,
          amount: transaction.amount.toFixed(2),
          currency: transaction.currency,
          status: transaction.status,
          occurred_at: transaction.occurredAt.toISOString(),
        })),
      };
    });
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
