'use client';

import { can } from '@yallego/contracts';
import type { TransactionSummaryItem } from '@yallego/contracts';

import { useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { formatCurrency, formatElapsed } from '@/shared/lib/format';

import { StatusBadge } from './StatusBadge';

function walletColorClass(walletCode: string): string {
  if (walletCode === 'YAPE') return 'text-wallet-yape';
  if (walletCode.startsWith('PLIN')) return 'text-wallet-plin';
  if (walletCode === 'BIM') return 'text-wallet-bim';
  return 'text-neutral-500';
}

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
  const role = session?.tenants[0]?.role;
  const canReview = role ? can(role, 'transactions:review') : false;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onSelect(transaction)}
          type="button"
        >
          <p className="text-2xl font-bold text-neutral-900 sm:text-3xl">
            {formatCurrency(transaction.amount, transaction.currency)}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-neutral-700">
            {transaction.sender_name ?? 'Remitente no identificado'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span className={`font-semibold ${walletColorClass(transaction.wallet.code)}`}>
              {transaction.wallet.display_name}
            </span>
            <span aria-hidden="true">·</span>
            <span>{transaction.device.label}</span>
            <span aria-hidden="true">·</span>
            <span>{formatElapsed(transaction.occurred_at)}</span>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={transaction.status} />
          {transaction.security_code && (
            <span
              aria-label={`Código de seguridad ${transaction.security_code}`}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-white"
            >
              {transaction.security_code}
            </span>
          )}
        </div>
      </div>

      {canReview && transaction.status === 'CAPTURED' && (
        <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-success-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-success-600 disabled:opacity-50"
            disabled={isBusy}
            onClick={() => onConfirm(transaction)}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="check" />
            Confirmar
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 px-3 py-2 text-sm font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
            disabled={isBusy}
            onClick={() => onDispute(transaction)}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
            Disputar
          </button>
        </div>
      )}
      {canReview && transaction.status === 'CONFIRMED' && (
        <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-3">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger-200 px-3 py-2 text-sm font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
            disabled={isBusy}
            onClick={() => onDispute(transaction)}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
            Disputar
          </button>
        </div>
      )}
    </div>
  );
}
