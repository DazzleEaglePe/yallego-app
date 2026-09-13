'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { confirmTransaction, disputeTransaction } from '../api/transactions';

export function useTransactionActions() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    void queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
  };

  const confirm = useMutation({
    mutationFn: ({ transactionId, note }: { transactionId: string; note?: string }) =>
      confirmTransaction(accessToken, transactionId, note),
    onSuccess: invalidate,
  });

  const dispute = useMutation({
    mutationFn: ({ transactionId, note }: { transactionId: string; note?: string }) =>
      disputeTransaction(accessToken, transactionId, note),
    onSuccess: invalidate,
  });

  return { confirm, dispute };
}
