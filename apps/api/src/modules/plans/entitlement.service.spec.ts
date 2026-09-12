import { SubscriptionStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { EntitlementService, type SubscriptionEntitlement } from './entitlement.service';

describe('EntitlementService', () => {
  const service = new EntitlementService({} as never, {} as never);
  const now = new Date('2026-09-11T12:00:00.000Z');

  it('allows onboarding before the trial clock starts', () => {
    const decision = service.evaluate(subscription(SubscriptionStatus.PENDING_TRIAL), now);
    expect(decision).toMatchObject({ canRead: true, canOperate: true, reason: 'NONE' });
  });

  it('allows an active trial before its exact expiration instant', () => {
    const decision = service.evaluate(
      subscription(SubscriptionStatus.TRIALING, {
        trialStartedAt: new Date('2026-09-10T12:00:00.000Z'),
        trialEndsAt: new Date('2026-09-13T12:00:00.000Z'),
      }),
      now,
    );
    expect(decision.canOperate).toBe(true);
  });

  it('turns an expired trial into read-only access', () => {
    const decision = service.evaluate(
      subscription(SubscriptionStatus.TRIALING, {
        trialStartedAt: new Date('2026-09-08T12:00:00.000Z'),
        trialEndsAt: now,
      }),
      now,
    );
    expect(decision).toMatchObject({
      canRead: true,
      canOperate: false,
      canConfigure: false,
      reason: 'TRIAL_EXPIRED',
    });
    expect(() => service.assertCanOperate(decision)).toThrow(ApiHttpException);
  });

  it('fails closed when trial dates are incomplete', () => {
    const decision = service.evaluate(subscription(SubscriptionStatus.TRIALING), now);
    expect(decision.reason).toBe('INVALID_CONFIGURATION');
    try {
      service.assertCanOperate(decision);
      expect.unreachable();
    } catch (error) {
      expect((error as ApiHttpException).getStatus()).toBe(503);
    }
  });

  it.each([SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED])(
    'keeps %s readable but blocks operations',
    (status) => {
      const decision = service.evaluate(subscription(status), now);
      expect(decision).toMatchObject({ canRead: true, canOperate: false });
      try {
        service.assertCanOperate(decision);
        expect.unreachable();
      } catch (error) {
        expect((error as ApiHttpException).getStatus()).toBe(402);
        expect((error as ApiHttpException).code).toBe('SUBSCRIPTION_REQUIRED');
      }
    },
  );

  it('does not grant read or operational access when no subscription exists', () => {
    expect(service.evaluate(null, now)).toMatchObject({
      accessState: 'MISSING',
      canRead: false,
      canOperate: false,
    });
  });

  it('treats a trial closed by total-limit as expired even before trial_ends_at', () => {
    const decision = service.evaluate(
      subscription(SubscriptionStatus.TRIALING, {
        trialStartedAt: new Date('2026-09-11T00:00:00.000Z'),
        trialEndsAt: new Date('2026-09-14T00:00:00.000Z'),
        trialEndedAt: new Date('2026-09-11T11:00:00.000Z'),
        trialEndReason: 'TOTAL_LIMIT',
      }),
      now,
    );
    expect(decision).toMatchObject({ canOperate: false, reason: 'TRIAL_EXPIRED' });
  });

  describe('resolveDayWindow', () => {
    it('resolves the local calendar day even when it differs from the UTC day', () => {
      // 2026-09-11T03:00:00Z es 2026-09-10T22:00:00 en America/Lima (UTC-5):
      // UTC ya cruzó al día 11, pero el día local todavía es el 10.
      const { start, end } = service.resolveDayWindow(
        'America/Lima',
        new Date('2026-09-11T03:00:00.000Z'),
      );
      expect(start.toISOString()).toBe('2026-09-10T05:00:00.000Z');
      expect(end.toISOString()).toBe('2026-09-11T05:00:00.000Z');
    });

    it('resolves a 23-hour local day correctly across a DST spring-forward transition', () => {
      // 2026-03-08 es el cambio a horario de verano en America/New_York
      // (2am -> 3am): el día local dura 23h, no 24h.
      const { start, end } = service.resolveDayWindow(
        'America/New_York',
        new Date('2026-03-08T12:00:00.000Z'),
      );
      expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
      expect(end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
      expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1_000);
    });
  });
});

function subscription(
  status: SubscriptionStatus,
  override: Partial<SubscriptionEntitlement> = {},
): SubscriptionEntitlement {
  return {
    id: 'subscription-1',
    tenantId: 'tenant-1',
    planId: 'plan-1',
    billingCycle: 'MONTHLY',
    status,
    periodStart: new Date('2026-09-01T00:00:00.000Z'),
    periodEnd: new Date('2026-10-01T00:00:00.000Z'),
    cancelAtPeriodEnd: false,
    canceledAt: null,
    trialStartedAt: null,
    trialEndsAt: null,
    trialEndedAt: null,
    trialEndReason: null,
    paidThrough: null,
    pendingPlanId: null,
    pendingBillingCycle: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    plan: {} as SubscriptionEntitlement['plan'],
    pendingPlan: null,
    ...override,
  };
}
