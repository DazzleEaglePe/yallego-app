import type { BillingCycle } from './subscriptions.schemas.js';

export interface PlanLimits {
  wallets: number;
  devices: number;
  transactions_per_month: number;
  transactions_per_period?: number;
  transactions_per_day?: number;
  trial_duration_hours?: number;
  users: number;
  webhooks: number;
  websocket_api: boolean;
  retention_days: number;
  rate_limit_per_minute: number;
  support: string;
}

export interface PlanSummary {
  code: string;
  display_name: string;
  description: string | null;
  price_monthly: string;
  price_semiannual: string | null;
  price_annual: string | null;
  currency: string;
  limits: PlanLimits;
}

export interface SubscriptionUsage {
  transactions_count: number;
  api_calls_count: number;
  webhook_calls_count: number;
}

export interface SubscriptionSummary {
  plan: PlanSummary;
  billing_cycle: BillingCycle;
  status: string;
  period_start: string;
  period_end: string;
  /** Plan al que se pasará al cierre del período actual (downgrade ya confirmado, pendiente de aplicar). */
  pending_plan: PlanSummary | null;
  access_state: 'PENDING_TRIAL' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  trial: {
    started_at: string | null;
    ends_at: string | null;
    ended_at: string | null;
    end_reason: 'TIME_LIMIT' | 'TOTAL_LIMIT' | 'ADMINISTRATIVE' | null;
    transactions_today: number;
    transactions_total: number;
  } | null;
  usage: SubscriptionUsage;
}

export interface SubscriptionChangeRequestResponse {
  status: 'PENDING_PAYMENT';
  requested_plan: string;
  billing_cycle: BillingCycle;
  amount_due: string;
  currency: string;
  payment_instructions: { method: 'TRANSFER'; reference: string };
  message: string;
}

export interface SubscriptionChangeHistoryItem {
  id: string;
  from_plan: string | null;
  to_plan: string;
  from_cycle: BillingCycle | null;
  to_cycle: BillingCycle;
  effective_at: string;
  performed_by: string | null;
  reason: string | null;
  created_at: string;
}
