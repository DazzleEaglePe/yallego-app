import type { TransactionStatus } from '@yallego/contracts';

const STYLES: Record<TransactionStatus, string> = {
  CAPTURED: 'bg-info-50 text-info-600',
  CONFIRMED: 'bg-success-50 text-success-600',
  DISPUTED: 'bg-danger-50 text-danger-600',
  VOIDED: 'bg-neutral-100 text-neutral-500',
};

const LABELS: Record<TransactionStatus, string> = {
  CAPTURED: 'Capturado',
  CONFIRMED: 'Confirmado',
  DISPUTED: 'Disputado',
  VOIDED: 'Anulado',
};

export function StatusBadge({ status }: Readonly<{ status: TransactionStatus }>) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
