export interface AuditEventSummary {
  id: string;
  action: string;
  actor_type: string;
  actor_user_id: string | null;
  actor_api_key_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditEventListResponse {
  data: AuditEventSummary[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
    limit: number;
  };
}
