import { describe, expect, it, vi } from 'vitest';

import { DeviceGatewayService } from './device-gateway.service';

describe('DeviceGatewayService.heartbeat', () => {
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
    );

    const result = await service.getMobileOverview({
      id: 'device-1',
      tenantId: 'tenant-1',
    } as never);

    expect(result.subscription).toMatchObject({
      plan_code: 'FREE',
      transactions_used: 12,
      transactions_limit: 100,
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
