'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { fetchTransactions, type TransactionFilters } from '../api/transactions';

export const transactionsQueryKey = (filters: TransactionFilters) =>
  ['transactions', filters] as const;

export function useTransactions(filters: TransactionFilters) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useInfiniteQuery({
    queryKey: transactionsQueryKey(filters),
    queryFn: ({ pageParam }) =>
      fetchTransactions(accessToken!, { ...filters, cursor: pageParam ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
    enabled: Boolean(accessToken),
  });
}
