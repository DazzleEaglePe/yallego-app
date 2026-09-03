import { describe, expect, it } from 'vitest';

import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { PlanLimitsService } from './plan-limits.service';

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

  it('treats a missing field as unlimited', () => {
    expect(() => service.assertWithin({}, 'devices', 1_000_000, 'límite')).not.toThrow();
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
