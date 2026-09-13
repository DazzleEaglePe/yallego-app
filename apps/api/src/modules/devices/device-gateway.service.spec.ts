import { generateKeyPairSync, sign } from 'node:crypto';
import type { PairDeviceInput } from '@yallego/contracts';
import { describe, expect, it, vi } from 'vitest';

import { DeviceGatewayService } from './device-gateway.service';

type IdentityClaimSubject = {
  claimTrialIdentities(tx: unknown, tenantId: string, input: PairDeviceInput): Promise<void>;
};

function signedPairingInput(): PairDeviceInput {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const publicKeyBase64 = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  const input = {
    code: 'PAIR-1234',
    device: {
      manufacturer: 'Google',
      model: 'Pixel',
      os_version: '16',
      app_version: '1.2.3',
    },
    identity: {
      installation_id: '7e125dea-c6d2-4bd6-9d89-a2f0351a0aaa',
      android_id: 'android-id-123',
      public_key: publicKeyBase64,
      request_signature: '',
    },
  } satisfies PairDeviceInput;
  const payload = [
    'v1',
    input.code,
    input.identity.installation_id,
    input.identity.android_id,
    input.identity.public_key,
    input.device.manufacturer,
    input.device.model,
    input.device.os_version,
    input.device.app_version,
  ].join('\n');
  input.identity.request_signature = sign('sha256', Buffer.from(payload), privateKey).toString(
    'base64',
  );
  return input;
}

describe('DeviceGatewayService', () => {
  it('rejects an invalid signature before creating a device when enforcement is active', async () => {
    const tx = {
      pairingCode: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'pairing-1',
          tenantId: 'tenant-1',
          label: null,
          usedAt: null,
          expiresAt: new Date('2099-01-01T00:00:00.000Z'),
          tenant: { id: 'tenant-1', status: 'ACTIVE' },
        }),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ plan: { code: 'TRIAL' } }),
      },
      device: { create: vi.fn() },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };
    const tokenService = { hashOpaqueToken: vi.fn().mockReturnValue('opaque-hash') };
    const devicesService = { assertWithinDeviceLimit: vi.fn() };
    const metrics = { trialIdentityPairingsTotal: { inc: vi.fn() } };
    const service = new DeviceGatewayService(
      prisma as never,
      tokenService as never,
      devicesService as never,
      {} as never,
      {} as never,
      {} as never,
      { modeFor: () => 'ENFORCE' } as never,
      metrics as never,
    );

    await expect(
      service.pairDevice({
        code: 'PAIR-1234',
        device: { app_version: '1.0.0' },
        identity: {
          installation_id: '7e125dea-c6d2-4bd6-9d89-a2f0351a0aaa',
          android_id: 'android-id-123',
          public_key: 'not-a-public-key-but-long-enough-for-the-contract',
          request_signature: 'not-a-valid-signature-but-long-enough-for-the-contract',
        },
      }),
    ).rejects.toMatchObject({ code: 'DEVICE_INTEGRITY_REQUIRED' });
    expect(tx.device.create).not.toHaveBeenCalled();
    expect(metrics.trialIdentityPairingsTotal.inc).toHaveBeenCalledWith({
      mode: 'ENFORCE',
      outcome: 'invalid_signature',
    });
  });

  it('never requires trial identity from a paid tenant', async () => {
    const tx = {
      subscription: { findFirst: vi.fn().mockResolvedValue({ plan: { code: 'NEGOCIO' } }) },
      $queryRaw: vi.fn(),
    };
    const metrics = { trialIdentityPairingsTotal: { inc: vi.fn() } };
    const service = new DeviceGatewayService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { modeFor: () => 'ENFORCE' } as never,
      metrics as never,
    );

    await expect(
      (service as unknown as IdentityClaimSubject).claimTrialIdentities(tx, 'tenant-paid', {
        code: 'PAIR-1234',
        device: { app_version: '0.9.0' },
      }),
    ).resolves.toBeUndefined();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(metrics.trialIdentityPairingsTotal.inc).not.toHaveBeenCalled();
  });

  it('observes a cross-tenant claim without blocking or leaking its hash', async () => {
    const tx = {
      subscription: { findFirst: vi.fn().mockResolvedValue({ plan: { code: 'TRIAL' } }) },
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'claim-new' }]),
      trialIdentityClaim: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'claim-android', tenantId: 'tenant-other', kind: 'ANDROID_ID' },
          { id: 'claim-new', tenantId: 'tenant-new', kind: 'INSTALLATION_KEY' },
        ]),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
      },
      auditEvent: { create: vi.fn() },
    };
    const metrics = { trialIdentityPairingsTotal: { inc: vi.fn() } };
    const service = new DeviceGatewayService(
      {} as never,
      { hashOpaqueToken: () => 'signal-hmac' } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { modeFor: () => 'OBSERVE' } as never,
      metrics as never,
    );

    await expect(
      (service as unknown as IdentityClaimSubject).claimTrialIdentities(
        tx,
        'tenant-new',
        signedPairingInput(),
      ),
    ).resolves.toBeUndefined();
    expect(tx.auditEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.trialIdentityClaim.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['claim-new'] } },
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'trial.identity_reuse_observed',
          metadata: expect.not.objectContaining({ valueHash: expect.anything() }),
        }),
      }),
    );
    expect(metrics.trialIdentityPairingsTotal.inc).toHaveBeenCalledWith({
      mode: 'OBSERVE',
      outcome: 'reuse_observed',
    });
  });

  it('returns the current enabled-wallet packages on every heartbeat', async () => {
    const updatedAt = new Date('2026-09-03T08:32:01.000Z');
    const tx = {
      device: {
        update: vi.fn().mockResolvedValue({
          id: 'device-1',
          tenantId: 'tenant-1',
          offlineNotifiedAt: null,
        }),
      },
      tenantWallet: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { wallet: { androidPackage: 'com.bcp.innovacxion.yapeapp' } },
            { wallet: { androidPackage: 'com.bbva.nxt_peru' } },
          ]),
        findFirst: vi.fn().mockResolvedValue({ updatedAt }),
      },
    };
    const prisma = {
      withoutTenantScope: vi.fn((operation) => operation(tx)),
    };
    const service = new DeviceGatewayService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { modeFor: () => 'OFF' } as never,
      {} as never,
    );

    const result = await service.heartbeat({ id: 'device-1', tenantId: 'tenant-1' } as never, {
      app_version: '1.2.3',
      queue_size: 0,
    });

    expect(result.monitored_packages).toEqual(['com.bcp.innovacxion.yapeapp', 'com.bbva.nxt_peru']);
    expect(result.config_version).toBe(Math.floor(updatedAt.getTime() / 1_000));
    expect(tx.tenantWallet.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', isEnabled: true },
      include: { wallet: true },
    });
    expect(tx.device.update).toHaveBeenCalledWith({
      where: { id: 'device-1' },
      data: { lastSeenAt: expect.any(Date), appVersion: '1.2.3' },
    });
  });

  it('returns only this device activity plus tenant plan usage', async () => {
    const tx = {
      tenant: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'tenant-1',
          businessName: 'Bodega Señal',
        }),
      },
      device: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'device-1',
          label: 'Caja principal',
        }),
      },
      tenantWallet: {
        findMany: vi.fn().mockResolvedValue([{ wallet: { code: 'YAPE', displayName: 'Yape' } }]),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValue({
          status: 'ACTIVE',
          periodStart: new Date('2026-09-01T00:00:00.000Z'),
          periodEnd: new Date('2026-10-01T00:00:00.000Z'),
          plan: {
            code: 'FREE',
            displayName: 'Gratis',
            limits: { transactions_per_month: 100 },
          },
        }),
      },
      usagePeriod: {
        findUnique: vi.fn().mockResolvedValue({ transactionsCount: 12 }),
      },
      transaction: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'transaction-1',
            senderNameEncrypted: Buffer.from('encrypted'),
            amount: { toFixed: () => '24.90' },
            currency: 'PEN',
            status: 'CONFIRMED',
            occurredAt: new Date('2026-09-09T15:00:00.000Z'),
            wallet: { code: 'YAPE', displayName: 'Yape' },
          },
        ]),
      },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };
    const cipher = { decrypt: vi.fn().mockReturnValue('Valery Pom') };
    const service = new DeviceGatewayService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      cipher as never,
      {} as never,
      { modeFor: () => 'OFF' } as never,
      {} as never,
    );

    const result = await service.getMobileOverview({
      id: 'device-1',
      tenantId: 'tenant-1',
    } as never);

    expect(result.subscription).toMatchObject({
      plan_code: 'FREE',
      access_state: 'ACTIVE',
      transactions_used: 12,
      transactions_limit: 100,
      trial: null,
    });
    expect(result.recent_activity[0]).toMatchObject({
      sender_name: 'Valery Pom',
      amount: '24.90',
      status: 'CONFIRMED',
    });
    expect(tx.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', deviceId: 'device-1' },
        take: 20,
      }),
    );
  });
});
