import type { AuditEventListResponse } from '@yallego/contracts';

import { authenticatedRequest, authenticatedTextRequest } from '@/shared/lib/api-client';

export interface AuditFilters {
  [key: string]: string | number | undefined;
  action?: string;
  actor_user_id?: string;
  cursor?: string;
  from?: string;
  limit?: number;
  resource_type?: string;
  to?: string;
}

function toQueryString(filters: AuditFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' || typeof value === 'number') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function fetchAuditEvents(
  accessToken: string,
  filters: AuditFilters,
): Promise<AuditEventListResponse> {
  return authenticatedRequest(`/audit${toQueryString(filters)}`, accessToken);
}

export function exportAuditCsv(accessToken: string, filters: AuditFilters): Promise<string> {
  return authenticatedTextRequest(`/audit/export${toQueryString(filters)}`, accessToken, {
    method: 'POST',
  });
}
