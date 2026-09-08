'use client';

import { can, type TransactionSummaryItem } from '@yallego/contracts';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { formatCurrency, formatElapsed } from '@/shared/lib/format';

import { StatusBadge } from './StatusBadge';

interface TransactionCardProps {
  transaction: TransactionSummaryItem;
  onSelect: (transaction: TransactionSummaryItem) => void;
  onConfirm: (transaction: TransactionSummaryItem) => void;
  onDispute: (transaction: TransactionSummaryItem) => void;
  isBusy: boolean;
}

export function TransactionCard({
  transaction,
  onSelect,
  onConfirm,
  onDispute,
  isBusy,
}: Readonly<TransactionCardProps>) {
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role;
  const canReview = role ? can(role, 'transactions:review') : false;
  const canConfirm = canReview && transaction.status === 'CAPTURED';
  const canDispute =
    canReview && transaction.status !== 'DISPUTED' && transaction.status !== 'VOIDED';

  return (
    <div className="grid gap-3 px-4 py-4 transition hover:bg-neutral-50 sm:px-5 lg:px-6 xl:grid-cols-[minmax(0,1fr)_170px] xl:items-center xl:gap-4">
      <button
        className="grid min-w-0 gap-3 text-left outline-none focus-visible:rounded-lg xl:grid-cols-[minmax(190px,1fr)_110px_130px_92px_112px] xl:items-center xl:gap-4"
        onClick={() => onSelect(transaction)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-neutral-950">
            {transaction.sender_name ?? 'Remitente no identificado'}
          </span>
          <span className="mt-1 block truncate text-xs text-neutral-500">
            {formatElapsed(transaction.occurred_at)} · {transaction.device.label}
          </span>
        </span>

        <span className="text-xs font-semibold text-[#c879d5]">
          {transaction.wallet.display_name}
        </span>

        <span className="financial-value text-base font-semibold text-neutral-950 xl:text-right">
          {formatCurrency(transaction.amount, transaction.currency)}
        </span>

        <span
          aria-label={
            transaction.security_code
              ? `Código de seguridad ${transaction.security_code}`
              : 'Sin código de seguridad'
          }
          className="w-fit rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-sm font-semibold tracking-[0.16em] text-neutral-700 xl:justify-self-end"
        >
          {transaction.security_code ?? '—'}
        </span>

        <span className="w-fit xl:justify-self-end">
          <StatusBadge status={transaction.status} />
        </span>
      </button>

      <div className="flex items-center gap-1 xl:justify-end">
        {canConfirm && (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-success-500 px-3 py-2 text-xs font-semibold text-neutral-950 transition hover:brightness-110 disabled:opacity-50"
            disabled={isBusy}
            onClick={() => onConfirm(transaction)}
            type="button"
          >
            <DashboardIcon className="h-3.5 w-3.5" name="check" />
            Confirmar
          </button>
        )}
        {canDispute && (
          <button
            aria-label={`Disputar cobro de ${transaction.sender_name ?? 'remitente no identificado'}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
            disabled={isBusy}
            onClick={() => onDispute(transaction)}
            type="button"
          >
            <DashboardIcon className="h-3.5 w-3.5" name="x" />
            Disputar
          </button>
        )}
        {!canConfirm && !canDispute && (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
            onClick={() => onSelect(transaction)}
            type="button"
          >
            Ver detalle
            <DashboardIcon className="h-3.5 w-3.5" name="chevron-right" />
          </button>
        )}
      </div>
    </div>
  );
}
