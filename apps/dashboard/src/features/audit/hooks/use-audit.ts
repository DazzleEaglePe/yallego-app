'use client';

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { exportAuditCsv, fetchAuditEvents, type AuditFilters } from '../api/audit';

export function useAuditEvents(filters: AuditFilters) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useInfiniteQuery({
    queryKey: ['audit', filters],
    queryFn: ({ pageParam }) =>
      fetchAuditEvents(accessToken!, { ...filters, cursor: pageParam ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_cursor ?? undefined) : undefined,
    enabled: Boolean(accessToken),
  });
}

export function useExportAudit() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';

  return useMutation({
    mutationFn: async (filters: AuditFilters) => {
      const csv = await exportAuditCsv(accessToken, filters);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
