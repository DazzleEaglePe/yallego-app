import { DeviceStatus } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceOfflineScheduler } from './device-offline.scheduler';

describe('DeviceOfflineScheduler', () => {
  const findDevices = vi.fn();
  const updateDevices = vi.fn();
  const findMemberships = vi.fn();
  const sendDeviceOfflineEmail = vi.fn();
  const tx = {
    device: { findMany: findDevices, updateMany: updateDevices },
    membership: { findMany: findMemberships },
  };
  const prisma = {
    withoutTenantScope: vi.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
  };

  let scheduler: DeviceOfflineScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));
    updateDevices.mockResolvedValue({ count: 1 });
    findMemberships.mockResolvedValue([
      {
        tenantId: 'tenant-1',
        user: { email: 'duena@negocio.pe', fullName: 'María Quispe' },
      },
    ]);
    sendDeviceOfflineEmail.mockResolvedValue(undefined);
    scheduler = new DeviceOfflineScheduler(
      prisma as never,
      { sendDeviceOfflineEmail } as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks a stale active device and alerts its owner or administrator once', async () => {
    const device = {
      id: 'device-1',
      tenantId: 'tenant-1',
      label: 'Caja principal',
      tenant: { businessName: 'Bodega Central' },
    };
    findDevices.mockResolvedValueOnce([device]).mockResolvedValueOnce([]);

    await scheduler.detectOfflineDevices();
    await scheduler.detectOfflineDevices();

    expect(findDevices).toHaveBeenCalledWith({
      where: {
        status: DeviceStatus.ACTIVE,
        offlineNotifiedAt: null,
        OR: [
          { lastSeenAt: { lt: new Date('2026-08-29T11:45:00.000Z') } },
          { lastSeenAt: null, pairedAt: { lt: new Date('2026-08-29T11:45:00.000Z') } },
        ],
      },
      include: { tenant: true },
    });
    expect(updateDevices).toHaveBeenCalledOnce();
    expect(findMemberships).toHaveBeenCalledWith({
      where: { tenantId: { in: ['tenant-1'] }, role: { in: ['OWNER', 'ADMIN'] } },
      include: { user: true },
    });
    expect(sendDeviceOfflineEmail).toHaveBeenCalledOnce();
    expect(sendDeviceOfflineEmail).toHaveBeenCalledWith({
      email: 'duena@negocio.pe',
      fullName: 'María Quispe',
      deviceLabel: 'Caja principal',
      businessName: 'Bodega Central',
    });
  });

  it('does nothing when every active device has a recent heartbeat', async () => {
    findDevices.mockResolvedValue([]);

    await scheduler.detectOfflineDevices();

    expect(updateDevices).not.toHaveBeenCalled();
    expect(findMemberships).not.toHaveBeenCalled();
    expect(sendDeviceOfflineEmail).not.toHaveBeenCalled();
  });
});
