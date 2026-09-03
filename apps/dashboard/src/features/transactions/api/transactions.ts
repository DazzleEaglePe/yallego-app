import type {
  TransactionListResponse,
  TransactionSummaryItem,
  TransactionsSummaryResponse,
} from '@yallego/contracts';

import { authenticatedRequest, authenticatedTextRequest } from '@/shared/lib/api-client';

export interface TransactionFilters {
  [key: string]: string | number | undefined;
  from?: string;
  to?: string;
  wallet_code?: string;
  device_id?: string;
  status?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  cursor?: string;
  limit?: number;
}

function toQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' || typeof value === 'number') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function fetchTransactions(
  accessToken: string,
  filters: TransactionFilters,
): Promise<TransactionListResponse> {
  return authenticatedRequest(`/transactions${toQueryString(filters)}`, accessToken);
}

export function fetchTransactionSummary(
  accessToken: string,
  range: { from?: string; to?: string },
): Promise<TransactionsSummaryResponse> {
  return authenticatedRequest(`/transactions/summary${toQueryString(range)}`, accessToken);
}

export function confirmTransaction(
  accessToken: string,
  transactionId: string,
  note?: string,
): Promise<TransactionSummaryItem> {
  return authenticatedRequest(`/transactions/${transactionId}/confirm`, accessToken, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

export function disputeTransaction(
  accessToken: string,
  transactionId: string,
  note?: string,
): Promise<TransactionSummaryItem> {
  return authenticatedRequest(`/transactions/${transactionId}/dispute`, accessToken, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

export function exportTransactionsCsv(
  accessToken: string,
  filters: TransactionFilters,
): Promise<string> {
  return authenticatedTextRequest(`/transactions/export${toQueryString(filters)}`, accessToken, {
    method: 'POST',
  });
}
