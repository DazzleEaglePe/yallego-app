'use client';

import { can, type TransactionSummaryItem } from '@yallego/contracts';
import { useEffect } from 'react';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
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
  const role = getActiveTenant(session)?.role;
  const canReview = role ? can(role, 'transactions:review') : false;
  const showActions =
    canReview && transaction.status !== 'DISPUTED' && transaction.status !== 'VOIDED';

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <>
      <button
        aria-label="Cerrar detalle"
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="transaction-detail-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-neutral-200 bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start justify-between border-b border-neutral-200 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Cobro detectado
            </p>
            <h2
              className="mt-1 text-lg font-semibold text-neutral-950"
              id="transaction-detail-title"
            >
              Detalle de transacción
            </h2>
          </div>
          <button
            aria-label="Cerrar"
            autoFocus
            className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-100"
            onClick={onClose}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="financial-value signal-value text-4xl font-semibold tracking-tight">
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {transaction.sender_name ?? 'Remitente no identificado'}
              </p>
            </div>
            <StatusBadge status={transaction.status} />
          </div>

          {transaction.security_code && (
            <section className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                Código de seguridad
              </p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.28em] text-neutral-950">
                {transaction.security_code}
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                Compáralo con el código mostrado en Yape.
              </p>
            </section>
          )}

          <section className="mt-7">
            <h3 className="text-sm font-semibold text-neutral-300">Información del cobro</h3>
            <dl className="mt-3 divide-y divide-neutral-200 border-y border-neutral-200">
              <Row label="Remitente" value={transaction.sender_name ?? 'No identificado'} />
              <Row label="Billetera" value={transaction.wallet.display_name} wallet />
              <Row label="Dispositivo" value={transaction.device.label} />
              <Row label="Fecha y hora" value={formatDateTime(transaction.occurred_at)} />
              {transaction.approval_code && (
                <Row label="Código de aprobación" value={transaction.approval_code} />
              )}
            </dl>
          </section>

          <section className="mt-7">
            <h3 className="text-sm font-semibold text-neutral-300">Actividad</h3>
            <ol className="mt-4 space-y-0">
              <TimelineItem
                active
                detail={formatDateTime(transaction.occurred_at)}
                title="Notificación capturada"
              />
              {transaction.confirmed_at && (
                <TimelineItem
                  active
                  detail={formatDateTime(transaction.confirmed_at)}
                  title="Cobro confirmado"
                />
              )}
              {transaction.status === 'DISPUTED' && (
                <TimelineItem danger detail="Marcado para revisión" title="Cobro disputado" />
              )}
            </ol>
          </section>
        </div>

        {showActions && (
          <footer className="flex gap-2 border-t border-neutral-200 bg-white px-5 py-4 sm:px-6">
            {transaction.status === 'CAPTURED' && (
              <button
                className="flex-1 rounded-lg bg-success-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:brightness-110 disabled:opacity-50"
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
          </footer>
        )}
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  wallet = false,
}: Readonly<{ label: string; value: string; wallet?: boolean }>) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 py-3.5 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`text-right font-medium ${wallet ? 'text-[#c879d5]' : 'text-neutral-300'}`}>
        {value}
      </dd>
    </div>
  );
}

function TimelineItem({
  active = false,
  danger = false,
  detail,
  title,
}: Readonly<{ active?: boolean; danger?: boolean; detail: string; title: string }>) {
  return (
    <li className="group relative flex gap-3 pb-5 last:pb-0">
      <span
        aria-hidden="true"
        className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
          danger
            ? 'border-danger-500 bg-danger-500'
            : active
              ? 'border-success-500 bg-success-500'
              : 'border-neutral-500 bg-neutral-900'
        }`}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-[4px] top-4 border-l border-neutral-200 group-last:hidden"
      />
      <span>
        <span className="block text-sm font-medium text-neutral-300">{title}</span>
        <span className="mt-0.5 block text-xs text-neutral-500">{detail}</span>
      </span>
    </li>
  );
}
