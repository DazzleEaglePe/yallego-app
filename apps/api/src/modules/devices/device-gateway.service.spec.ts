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
});
