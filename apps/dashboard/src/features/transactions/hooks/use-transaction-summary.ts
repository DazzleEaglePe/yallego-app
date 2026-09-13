'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { fetchTransactionSummary } from '../api/transactions';

export function useTransactionSummary(range: { from?: string; to?: string }) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: ['transactions-summary', range],
    queryFn: () => fetchTransactionSummary(accessToken!, range),
    enabled: Boolean(accessToken),
  });
}
