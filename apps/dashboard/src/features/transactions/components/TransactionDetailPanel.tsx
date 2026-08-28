'use client';

import { can } from '@yallego/contracts';
import type { TransactionSummaryItem } from '@yallego/contracts';

import { useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { formatCurrency, formatDateTime } from '@/shared/lib/format';

import { StatusBadge } from './StatusBadge';

interface TransactionDetailPanelProps {
  transaction: TransactionSummaryItem;
  onClose: () => void;
  onConfirm: (transaction: TransactionSummaryItem) => void;
  onDispute: (transaction: TransactionSummaryItem) => void;
  isBusy: boolean;
}

export function TransactionDetailPanel({
  transaction,
  onClose,
  onConfirm,
  onDispute,
  isBusy,
}: Readonly<TransactionDetailPanelProps>) {
  const { session } = useAuthSession();
  const role = session?.tenants[0]?.role;
  const canReview = role ? can(role, 'transactions:review') : false;

  return (
    <>
      <button
        aria-label="Cerrar detalle"
        className="fixed inset-0 z-40 bg-neutral-900/30"
        onClick={onClose}
        type="button"
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Detalle del cobro</h2>
          <button
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100"
            onClick={onClose}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
          </button>
        </div>

        <p className="mt-6 text-4xl font-bold text-neutral-900">
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        <div className="mt-2">
          <StatusBadge status={transaction.status} />
        </div>

        {transaction.security_code && (
          <div className="mt-5 rounded-xl bg-neutral-900 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Código de seguridad
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-white">
              {transaction.security_code}
            </p>
          </div>
        )}

        <dl className="mt-6 space-y-4 text-sm">
          <Row label="Remitente" value={transaction.sender_name ?? 'No identificado'} />
          <Row label="Billetera" value={transaction.wallet.display_name} />
          <Row label="Dispositivo" value={transaction.device.label} />
          <Row label="Ocurrió" value={formatDateTime(transaction.occurred_at)} />
          {transaction.approval_code && (
            <Row label="Código de aprobación" value={transaction.approval_code} />
          )}
          {transaction.confirmed_at && (
            <Row label="Confirmado" value={formatDateTime(transaction.confirmed_at)} />
          )}
        </dl>

        {canReview && transaction.status !== 'DISPUTED' && transaction.status !== 'VOIDED' && (
          <div className="mt-8 flex gap-2">
            {transaction.status === 'CAPTURED' && (
              <button
                className="flex-1 rounded-lg bg-success-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-success-600 disabled:opacity-50"
                disabled={isBusy}
                onClick={() => onConfirm(transaction)}
                type="button"
              >
                Confirmar cobro
              </button>
            )}
            <button
              className="flex-1 rounded-lg border border-danger-200 px-4 py-2.5 text-sm font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
              disabled={isBusy}
              onClick={() => onDispute(transaction)}
              type="button"
            >
              Disputar
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
