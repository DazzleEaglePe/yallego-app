import { useTransactionSummary } from '../hooks/use-transaction-summary';
import { formatCurrency } from '@/shared/lib/format';

export function SummaryStrip() {
  const { data, isLoading } = useTransactionSummary({});

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="h-20 animate-pulse rounded-2xl border border-neutral-200 bg-white"
            key={index}
          />
        ))}
      </div>
    );
  }

  const tiles = [
    { label: 'Cobros (14 días)', value: String(data.totals.count) },
    { label: 'Total capturado', value: formatCurrency(data.totals.amount, data.totals.currency) },
    {
      label: 'Promedio por cobro',
      value: formatCurrency(data.totals.average, data.totals.currency),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4" key={tile.label}>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {tile.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
