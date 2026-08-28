import type { BillingCycle, SubscriptionSummary } from '@yallego/contracts';

export const billingCycleLabels: Record<BillingCycle, string> = {
  ANNUAL: 'Anual',
  MONTHLY: 'Mensual',
  SEMIANNUAL: 'Semestral',
};

export function usagePercentage(current: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

export function usageTone(percentage: number): 'danger' | 'success' | 'warning' {
  if (percentage >= 100) return 'danger';
  if (percentage >= 80) return 'warning';
  return 'success';
}

export function subscriptionPrice(subscription: SubscriptionSummary): string {
  const plan = subscription.plan;
  const price =
    subscription.billing_cycle === 'ANNUAL'
      ? plan.price_annual
      : subscription.billing_cycle === 'SEMIANNUAL'
        ? plan.price_semiannual
        : plan.price_monthly;

  return price ?? plan.price_monthly;
}
