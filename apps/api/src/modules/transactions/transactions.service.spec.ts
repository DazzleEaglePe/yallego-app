import { describe, expect, it } from 'vitest';

import { resolveTransactionsSummaryPeriod } from './transactions.service';

describe('resolveTransactionsSummaryPeriod', () => {
  const now = new Date('2026-09-12T19:30:00.000Z');

  it('includes a small future device-clock skew in the live summary', () => {
    const period = resolveTransactionsSummaryPeriod({}, now);

    expect(period.from.toISOString()).toBe('2026-08-30T19:30:00.000Z');
    expect(period.to.toISOString()).toBe('2026-09-12T19:35:00.000Z');
  });

  it('preserves an explicit reporting window without tolerance', () => {
    const period = resolveTransactionsSummaryPeriod(
      {
        from: '2026-09-01T05:00:00.000Z',
        to: '2026-09-12T05:00:00.000Z',
      },
      now,
    );

    expect(period.from.toISOString()).toBe('2026-09-01T05:00:00.000Z');
    expect(period.to.toISOString()).toBe('2026-09-12T05:00:00.000Z');
  });
});
