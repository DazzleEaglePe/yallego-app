import { describe, expect, it } from 'vitest';

import { addBillingCycle } from './billing-cycle.util';

describe('addBillingCycle', () => {
  it('adds one month for MONTHLY', () => {
    expect(addBillingCycle(new Date('2026-01-15T00:00:00Z'), 'MONTHLY').toISOString()).toBe(
      '2026-02-15T00:00:00.000Z',
    );
  });

  it('adds six months for SEMIANNUAL', () => {
    expect(addBillingCycle(new Date('2026-01-15T00:00:00Z'), 'SEMIANNUAL').toISOString()).toBe(
      '2026-07-15T00:00:00.000Z',
    );
  });

  it('adds twelve months for ANNUAL', () => {
    expect(addBillingCycle(new Date('2026-01-15T00:00:00Z'), 'ANNUAL').toISOString()).toBe(
      '2027-01-15T00:00:00.000Z',
    );
  });

  it('rolls over the year boundary correctly', () => {
    expect(addBillingCycle(new Date('2026-12-20T00:00:00Z'), 'MONTHLY').toISOString()).toBe(
      '2027-01-20T00:00:00.000Z',
    );
  });
});
