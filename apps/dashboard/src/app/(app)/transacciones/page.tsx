'use client';

import type { TransactionSummaryItem } from '@yallego/contracts';
import { useState } from 'react';

import { ConnectionIndicator } from '@/features/transactions/components/ConnectionIndicator';
import { EmptyState } from '@/features/transactions/components/EmptyState';
import { ErrorState } from '@/features/transactions/components/ErrorState';
import { FiltersBar } from '@/features/transactions/components/FiltersBar';
import { SummaryStrip } from '@/features/transactions/components/SummaryStrip';
import { TransactionCard } from '@/features/transactions/components/TransactionCard';
import { TransactionDetailPanel } from '@/features/transactions/components/TransactionDetailPanel';
import { TransactionSkeleton } from '@/features/transactions/components/TransactionSkeleton';
import type { TransactionFilters } from '@/features/transactions/api/transactions';
import { useExportTransactions } from '@/features/transactions/hooks/use-export-transactions';
import { useRealtimeTransactions } from '@/features/transactions/hooks/use-realtime-transactions';
import { useTransactionActions } from '@/features/transactions/hooks/use-transaction-actions';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [selected, setSelected] = useState<TransactionSummaryItem | null>(null);

  const { status: realtimeStatus } = useRealtimeTransactions();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactions(filters);
  const { confirm, dispute } = useTransactionActions();
  const exportCsv = useExportTransactions();

  const transactions = data?.pages.flatMap((page) => page.data) ?? [];
  const hasFilters = Object.keys(filters).length > 0;
  const isBusy = confirm.isPending || dispute.isPending;

  function handleConfirm(transaction: TransactionSummaryItem) {
    confirm.mutate({ transactionId: transaction.id });
    setSelected(null);
  }

  function handleDispute(transaction: TransactionSummaryItem) {
    dispute.mutate({ transactionId: transaction.id });
    setSelected(null);
  }

  return (
    <div className="pb-6">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DashboardIcon className="h-5 w-5 text-brand-500" name="receipt" />
            <h1 className="text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
              Transacciones
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Tus cobros aparecen aquí en cuanto llegan, sin recargar la página.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionIndicator status={realtimeStatus} />
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate(filters)}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="download" />
            {exportCsv.isPending ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </section>

      <section className="mt-6">
        <SummaryStrip />
      </section>

      <section className="mt-4">
        <FiltersBar filters={filters} onChange={setFilters} />
      </section>

      <section className="mt-4 space-y-3">
        {isLoading && <TransactionSkeleton />}

        {isError && (
          <ErrorState
            message={error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && transactions.length === 0 && hasFilters && (
          <EmptyState
            action={
              <button
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                onClick={() => setFilters({})}
                type="button"
              >
                Limpiar filtros
              </button>
            }
            description="Ajusta o quita algunos filtros para ver más resultados."
            icon="search"
            title="No hay cobros con esos criterios"
          />
        )}

        {!isLoading && !isError && transactions.length === 0 && !hasFilters && (
          <EmptyState
            action={
              <a
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                href="/dispositivos"
              >
                Vincular dispositivo
              </a>
            }
            description="En cuanto vincules un celular Android y recibas tu primer cobro, aparecerá aquí al instante."
            icon="inbox"
            title="Todavía no se registran cobros"
          />
        )}

        {!isLoading &&
          !isError &&
          transactions.map((transaction) => (
            <TransactionCard
              isBusy={isBusy}
              key={transaction.id}
              onConfirm={handleConfirm}
              onDispute={handleDispute}
              onSelect={setSelected}
              transaction={transaction}
            />
          ))}

        {hasNextPage && (
          <button
            className="w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            type="button"
          >
            {isFetchingNextPage ? 'Cargando…' : 'Cargar más cobros'}
          </button>
        )}
      </section>

      {selected && (
        <TransactionDetailPanel
          isBusy={isBusy}
          onClose={() => setSelected(null)}
          onConfirm={handleConfirm}
          onDispute={handleDispute}
          transaction={selected}
        />
      )}
    </div>
  );
}
