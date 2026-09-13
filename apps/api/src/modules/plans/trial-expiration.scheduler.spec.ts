import { SubscriptionStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { TrialExpirationScheduler } from './trial-expiration.scheduler';

describe('TrialExpirationScheduler', () => {
  const dueTrial = {
    id: 'subscription-1',
    tenantId: 'tenant-1',
    trialEndsAt: new Date('2026-09-10T00:00:00.000Z'),
    tenant: { businessName: 'Bodega de prueba' },
  };

  it('does not notify when another replica already closed the trial', async () => {
    const tx = {
      subscription: {
        findMany: vi.fn().mockResolvedValue([dueTrial]),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      membership: { findMany: vi.fn() },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };
    const mailer = { sendTrialEndedEmail: vi.fn() };
    const metrics = { trialExpiredTotal: { inc: vi.fn() } };
    const scheduler = new TrialExpirationScheduler(
      prisma as never,
      mailer as never,
      metrics as never,
    );

    await scheduler.closeExpiredTrials();

    expect(tx.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: dueTrial.id,
          status: SubscriptionStatus.TRIALING,
          trialEndedAt: null,
        }),
      }),
    );
    expect(tx.membership.findMany).not.toHaveBeenCalled();
    expect(mailer.sendTrialEndedEmail).not.toHaveBeenCalled();
    expect(metrics.trialExpiredTotal.inc).not.toHaveBeenCalled();
  });

  it('notifies exactly once after it wins the conditional closure', async () => {
    const tx = {
      subscription: {
        findMany: vi.fn().mockResolvedValue([dueTrial]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      membership: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ user: { email: 'owner@example.test', fullName: 'Ana' } }]),
      },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };
    const mailer = { sendTrialEndedEmail: vi.fn().mockResolvedValue(undefined) };
    const metrics = { trialExpiredTotal: { inc: vi.fn() } };
    const scheduler = new TrialExpirationScheduler(
      prisma as never,
      mailer as never,
      metrics as never,
    );

    await scheduler.closeExpiredTrials();

    expect(metrics.trialExpiredTotal.inc).toHaveBeenCalledWith({ reason: 'TIME_LIMIT' });
    expect(mailer.sendTrialEndedEmail).toHaveBeenCalledWith({
      email: 'owner@example.test',
      fullName: 'Ana',
      businessName: dueTrial.tenant.businessName,
    });
  });
});
