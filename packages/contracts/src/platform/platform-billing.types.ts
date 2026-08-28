export interface ManualPaymentSummary {
  id: string;
  tenant_id: string;
  amount: string;
  currency: string;
  method: string | null;
  reference: string | null;
  covers_from: string;
  covers_to: string;
  confirmed_at: string;
}

export interface SubscriptionChangeApplicationResult {
  tenant_id: string;
  from_plan: string | null;
  to_plan: string;
  effective_at: string;
  immediate: boolean;
}
