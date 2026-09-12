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

export interface TrialIdentityOverrideResult {
  id: string;
  status: 'OVERRIDDEN';
}

export interface TrialIdentityClaimSummary {
  id: string;
  tenant_id: string;
  kind: 'ANDROID_ID' | 'INSTALLATION_KEY' | 'PLAY_RECALL' | 'PHONE' | 'TAX_ID';
  status: 'CLAIMED' | 'CONSUMED' | 'DENIED' | 'OVERRIDDEN';
  claimed_at: string;
  last_seen_at: string;
  expires_at: string | null;
}
