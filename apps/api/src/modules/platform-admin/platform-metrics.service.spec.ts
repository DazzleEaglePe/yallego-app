import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformMetricsService } from './platform-metrics.service';

describe('PlatformMetricsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00.000Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('reports rollout drift and conversion over the last seven days', async () => {
    const tx = {
      tenant: { groupBy: vi.fn().mockResolvedValue([{ status: 'ACTIVE', _count: 2 }]) },
      transaction: {
        aggregate: vi.fn().mockResolvedValue({ _count: 8, _sum: { amount: 125 } }),
      },
      rawNotification: {
        count: vi.fn().mockResolvedValueOnce(7).mockResolvedValueOnce(1),
      },
      webhookEndpoint: {
        groupBy: vi.fn().mockResolvedValue([{ isEnabled: true, _count: 1 }]),
      },
      webhookDelivery: {
        count: vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(1),
      },
      trialIdentityClaim: { count: vi.fn().mockResolvedValue(5) },
      auditEvent: {
        count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1),
      },
      subscriptionChange: { count: vi.fn().mockResolvedValue(3) },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };

    const result = await new PlatformMetricsService(prisma as never).getGlobalMetrics();

    expect(result.trial_rollout).toEqual({
      identity_claims_last_7_days: 5,
      reuse_observed_last_7_days: 2,
      overrides_last_7_days: 1,
      conversions_last_7_days: 3,
    });
    const rolloutSince = new Date('2026-09-05T12:00:00.000Z');
    expect(tx.trialIdentityClaim.count).toHaveBeenCalledWith({
      where: { claimedAt: { gte: rolloutSince } },
    });
    expect(tx.subscriptionChange.count).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: rolloutSince },
        fromPlan: { code: 'TRIAL' },
        toPlan: { code: { notIn: ['TRIAL', 'FREE', 'LEGACY_FREE'] } },
      },
    });
  });
});
