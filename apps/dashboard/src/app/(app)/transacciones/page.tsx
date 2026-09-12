'use client';

import type { TransactionSummaryItem } from '@yallego/contracts';
import Link from 'next/link';
import { useState } from 'react';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import type { TransactionFilters } from '@/features/transactions/api/transactions';
import { ConnectionIndicator } from '@/features/transactions/components/ConnectionIndicator';
import { EmptyState } from '@/features/transactions/components/EmptyState';
import { ErrorState } from '@/features/transactions/components/ErrorState';
import { FiltersBar } from '@/features/transactions/components/FiltersBar';
import { SummaryStrip } from '@/features/transactions/components/SummaryStrip';
import { TransactionCard } from '@/features/transactions/components/TransactionCard';
import { TransactionDetailPanel } from '@/features/transactions/components/TransactionDetailPanel';
import { TransactionSkeleton } from '@/features/transactions/components/TransactionSkeleton';
import { useExportTransactions } from '@/features/transactions/hooks/use-export-transactions';
import { useRealtimeTransactions } from '@/features/transactions/hooks/use-realtime-transactions';
import { useTransactionActions } from '@/features/transactions/hooks/use-transaction-actions';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';

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
  const hasFilters = Object.values(filters).some((value) => value !== undefined && value !== '');
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
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-400" name="receipt" />
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-3xl">
              Transacciones
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Consulta, confirma y audita los cobros que llegan desde tu Android.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ConnectionIndicator status={realtimeStatus} />
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
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

      <section className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="hidden grid-cols-[minmax(180px,1fr)_100px_110px_80px_116px_210px] gap-3 border-b border-neutral-200 bg-neutral-50 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 xl:grid">
          <span>Remitente</span>
          <span>Billetera</span>
          <span className="text-right">Importe</span>
          <span className="text-right">Código</span>
          <span className="text-right">Estado</span>
          <span className="text-right">Acciones</span>
        </div>

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
              <Link
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
                href="/dispositivos"
              >
                Vincular dispositivo
              </Link>
            }
            description="Cuando el Android detecte una notificación válida de Yape, aparecerá aquí al instante."
            icon="inbox"
            title="Todavía no se registran cobros"
          />
        )}

        {!isLoading && !isError && transactions.length > 0 && (
          <div className="divide-y divide-neutral-100">
            {transactions.map((transaction) => (
              <TransactionCard
                isBusy={isBusy}
                key={transaction.id}
                onConfirm={handleConfirm}
                onDispute={handleDispute}
                onSelect={setSelected}
                transaction={transaction}
              />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div className="border-t border-neutral-200 p-3">
            <button
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
              type="button"
            >
              {isFetchingNextPage ? 'Cargando…' : 'Cargar más cobros'}
            </button>
          </div>
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
