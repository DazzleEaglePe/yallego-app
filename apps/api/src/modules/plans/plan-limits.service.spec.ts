import { describe, expect, it, vi } from 'vitest';

import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { PlanLimitsService, validatePlanLimits } from './plan-limits.service';

// `assertWithin` no toca Prisma: se prueba sin levantar la base de datos,
// como el resto de la lógica pura de este módulo.
describe('PlanLimitsService.assertWithin', () => {
  const service = new PlanLimitsService({} as never);

  it('allows usage strictly below the limit', () => {
    expect(() => service.assertWithin({ devices: 3 }, 'devices', 2, 'límite')).not.toThrow();
  });

  it('rejects usage at or above the limit', () => {
    expect(() => service.assertWithin({ devices: 3 }, 'devices', 3, 'límite')).toThrow(
      ApiHttpException,
    );
    expect(() => service.assertWithin({ devices: 3 }, 'devices', 4, 'límite')).toThrow(
      ApiHttpException,
    );
  });

  it('treats -1 as unlimited regardless of usage', () => {
    expect(() =>
      service.assertWithin({ devices: -1 }, 'devices', 1_000_000, 'límite'),
    ).not.toThrow();
  });

  it('fails closed when the requested limit is missing', () => {
    try {
      service.assertWithin({}, 'devices', 0, 'límite');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiHttpException);
      expect((error as ApiHttpException).getStatus()).toBe(503);
      expect((error as ApiHttpException).code).toBe('SERVICE_UNAVAILABLE');
      expect((error as ApiHttpException).details).toEqual({ field: 'devices' });
    }
  });

  it('fails closed when a numeric limit is malformed', () => {
    expect(() => service.assertWithin({ devices: -2 }, 'devices', 0, 'límite')).toThrow(
      ApiHttpException,
    );
  });

  it('includes the limit and current usage in the thrown exception details', () => {
    try {
      service.assertWithin({ devices: 2 }, 'devices', 2, 'límite alcanzado');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiHttpException);
      const apiError = error as ApiHttpException;
      expect(apiError.code).toBe('PLAN_LIMIT_EXCEEDED');
      expect(apiError.details).toEqual({ limit: 2, current: 2 });
    }
  });

  it('merges extra details into the thrown exception, e.g. resets_at', () => {
    try {
      service.assertWithin(
        { transactions_per_month: 200 },
        'transactions_per_month',
        200,
        'límite',
        { resets_at: '2026-09-01' },
      );
      expect.unreachable();
    } catch (error) {
      expect((error as ApiHttpException).details).toEqual({
        limit: 200,
        current: 200,
        resets_at: '2026-09-01',
      });
    }
  });
});

describe('validatePlanLimits', () => {
  const complete = {
    wallets: 1,
    devices: 1,
    transactions_per_month: 100,
    users: 1,
    webhooks: 0,
    websocket_api: false,
    retention_days: 30,
    rate_limit_per_minute: 0,
    support: 'community',
  };

  it('accepts a complete paid or legacy plan', () => {
    expect(validatePlanLimits('FREE', complete)).toEqual(complete);
  });

  it('requires trial-specific limits for the internal TRIAL plan', () => {
    expect(() => validatePlanLimits('TRIAL', complete)).toThrow(ApiHttpException);
    expect(
      validatePlanLimits('TRIAL', {
        ...complete,
        transactions_per_period: 100,
        transactions_per_day: 50,
        trial_duration_hours: 72,
      }),
    ).toMatchObject({ transactions_per_period: 100, transactions_per_day: 50 });
  });

  it('rejects malformed or incomplete plan configuration', () => {
    expect(() => validatePlanLimits('FREE', { ...complete, devices: -2 })).toThrow(
      ApiHttpException,
    );
    expect(() => validatePlanLimits('FREE', { ...complete, users: undefined })).toThrow(
      ApiHttpException,
    );
  });
});

describe('PlanLimitsService.onApplicationBootstrap', () => {
  const complete = {
    wallets: 1,
    devices: 1,
    transactions_per_month: 100,
    users: 1,
    webhooks: 0,
    websocket_api: false,
    retention_days: 30,
    rate_limit_per_minute: 10,
    support: 'community',
  };

  it('validates the complete catalog during startup', async () => {
    const findMany = vi.fn().mockResolvedValue([{ code: 'FREE', limits: complete }]);
    const service = serviceWithCatalog(findMany);

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(findMany).toHaveBeenCalledOnce();
  });

  it('fails startup when the catalog is empty or malformed', async () => {
    await expect(
      serviceWithCatalog(vi.fn().mockResolvedValue([])).onApplicationBootstrap(),
    ).rejects.toBeInstanceOf(ApiHttpException);
    await expect(
      serviceWithCatalog(
        vi.fn().mockResolvedValue([{ code: 'FREE', limits: { ...complete, devices: -2 } }]),
      ).onApplicationBootstrap(),
    ).rejects.toBeInstanceOf(ApiHttpException);
  });
});

function serviceWithCatalog(findMany: () => Promise<Array<{ code: string; limits: object }>>) {
  const prisma = {
    withoutTenantScope: (
      operation: (tx: {
        plan: { findMany: () => Promise<Array<{ code: string; limits: object }>> };
      }) => unknown,
    ) => operation({ plan: { findMany } }),
  };
  return new PlanLimitsService(prisma as never);
}
