import type { TransactionStatus } from '@yallego/contracts';

const STYLES: Record<TransactionStatus, string> = {
  CAPTURED: 'bg-warning-50 text-warning-600',
  CONFIRMED: 'bg-success-50 text-success-600',
  DISPUTED: 'bg-danger-50 text-danger-600',
  VOIDED: 'bg-neutral-100 text-neutral-500',
};

const DOT_STYLES: Record<TransactionStatus, string> = {
  CAPTURED: 'bg-warning-500',
  CONFIRMED: 'bg-success-500',
  DISPUTED: 'bg-danger-500',
  VOIDED: 'bg-neutral-500',
};

const LABELS: Record<TransactionStatus, string> = {
  CAPTURED: 'Por revisar',
  CONFIRMED: 'Confirmado',
  DISPUTED: 'Disputado',
  VOIDED: 'Anulado',
};

export function StatusBadge({ status }: Readonly<{ status: TransactionStatus }>) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STYLES[status]}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status]}`} />
      {LABELS[status]}
    </span>
  );
}
