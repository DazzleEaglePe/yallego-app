import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookQueueDepthAlertScheduler } from './webhook-queue-depth-alert.scheduler';

describe('WebhookQueueDepthAlertScheduler', () => {
  const getWaitingCount = vi.fn();
  const findAdmins = vi.fn();
  const redisSet = vi.fn();
  const sendPlatformAlertEmail = vi.fn();
  const setMetric = vi.fn();
  const tx = { platformAdmin: { findMany: findAdmins } };
  const prisma = {
    withoutTenantScope: vi.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
  };

  let scheduler: WebhookQueueDepthAlertScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    findAdmins.mockResolvedValue([
      { email: 'ops@yallego.app', fullName: 'Operaciones Yallegó' },
    ]);
    sendPlatformAlertEmail.mockResolvedValue(undefined);
    scheduler = new WebhookQueueDepthAlertScheduler(
      { getWaitingCount } as never,
      prisma as never,
      { set: redisSet } as never,
      { sendPlatformAlertEmail } as never,
      { webhookQueueDepth: { set: setMetric } } as never,
      { get: () => 100 } as never,
    );
  });

  it('alerts platform admins when the waiting queue exceeds its threshold', async () => {
    getWaitingCount.mockResolvedValue(101);
    redisSet.mockResolvedValue('OK');

    await scheduler.checkQueueDepth();

    expect(setMetric).toHaveBeenCalledWith(101);
    expect(redisSet).toHaveBeenCalledWith('alert:webhook-queue-depth', '1', 'EX', 3600, 'NX');
    expect(sendPlatformAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ops@yallego.app',
        subject: 'La cola de entrega de webhooks acumuló un backlog',
        message: expect.stringContaining('101 trabajos en espera'),
      }),
    );
  });

  it('does not resend the alert while its Redis deduplication key exists', async () => {
    getWaitingCount.mockResolvedValue(150);
    redisSet.mockResolvedValue(null);

    await scheduler.checkQueueDepth();

    expect(findAdmins).not.toHaveBeenCalled();
    expect(sendPlatformAlertEmail).not.toHaveBeenCalled();
  });

  it('does not alert when depth is exactly the configured threshold', async () => {
    getWaitingCount.mockResolvedValue(100);

    await scheduler.checkQueueDepth();

    expect(setMetric).toHaveBeenCalledWith(100);
    expect(redisSet).not.toHaveBeenCalled();
    expect(sendPlatformAlertEmail).not.toHaveBeenCalled();
  });
});
