import type { TenantStatus } from './platform-tenants.schemas.js';

export interface PlatformTenantSummary {
  id: string;
  slug: string;
  business_name: string;
  status: TenantStatus;
  plan_code: string | null;
  member_count: number;
  created_at: string;
}

export interface PlatformTenantDetail extends PlatformTenantSummary {
  legal_name: string | null;
  tax_id: string | null;
  country: string;
  owner_email: string | null;
  device_count: number;
  transactions_last_30_days: number;
}

export interface PlatformTenantListResponse {
  data: PlatformTenantSummary[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
    limit: number;
  };
}
