'use client';

import { useMutation } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { exportTransactionsCsv, type TransactionFilters } from '../api/transactions';

export function useExportTransactions() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';

  return useMutation({
    mutationFn: async (filters: TransactionFilters) => {
      const csv = await exportTransactionsCsv(accessToken, filters);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transacciones-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
