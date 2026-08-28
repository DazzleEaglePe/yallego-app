import { describe, expect, it } from 'vitest';

import type { SubscriptionSummary } from '@yallego/contracts';

import { subscriptionPrice, usagePercentage, usageTone } from './subscription-config';

describe('usagePercentage', () => {
  it('calcula el avance y limita la barra visual al cien por ciento', () => {
    expect(usagePercentage(500, 2_000)).toBe(25);
    expect(usagePercentage(2_500, 2_000)).toBe(100);
    expect(usagePercentage(10, 0)).toBe(0);
  });
});

describe('usageTone', () => {
  it('distingue consumo normal, advertencia y límite alcanzado', () => {
    expect(usageTone(79)).toBe('success');
    expect(usageTone(80)).toBe('warning');
    expect(usageTone(100)).toBe('danger');
  });
});

describe('subscriptionPrice', () => {
  const subscription = {
    billing_cycle: 'ANNUAL',
    plan: {
      price_annual: '300.00',
      price_monthly: '30.00',
      price_semiannual: '170.00',
    },
  } as SubscriptionSummary;

  it('elige el precio del ciclo contratado', () => {
    expect(subscriptionPrice(subscription)).toBe('300.00');
    expect(subscriptionPrice({ ...subscription, billing_cycle: 'SEMIANNUAL' })).toBe('170.00');
    expect(subscriptionPrice({ ...subscription, billing_cycle: 'MONTHLY' })).toBe('30.00');
  });
});
