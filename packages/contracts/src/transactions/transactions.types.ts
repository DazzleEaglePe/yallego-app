export type TransactionStatus = 'CAPTURED' | 'CONFIRMED' | 'DISPUTED' | 'VOIDED';

export interface TransactionSummaryItem {
  id: string;
  wallet: { code: string; display_name: string };
  sender_name: string | null;
  amount: string;
  currency: string;
  security_code: string | null;
  approval_code: string | null;
  status: TransactionStatus;
  occurred_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  device: { id: string; label: string };
}

export interface TransactionListResponse {
  data: TransactionSummaryItem[];
  pagination: { has_more: boolean; next_cursor: string | null; limit: number };
}

export interface TransactionsSummaryResponse {
  period: { from: string; to: string };
  totals: { count: number; amount: string; currency: string; average: string };
  by_wallet: Array<{ wallet_code: string; count: number; amount: string }>;
  by_day: Array<{ date: string; count: number; amount: string }>;
}

/** Payload emitido por el canal `wss://.../v1/realtime` (docs/06_API_CONTRACT.md §10). */
export interface RealtimeConnectedPayload {
  tenant_id: string;
  session_id: string;
}

export interface RealtimeDeviceStatusChangedPayload {
  device_id: string;
  connectivity: 'ONLINE' | 'OFFLINE';
  changed_at: string;
}
