import { useTransactionSummary } from '../hooks/use-transaction-summary';
import { formatCurrency } from '@/shared/lib/format';

export function SummaryStrip() {
  const { data, isLoading } = useTransactionSummary({});

  if (isLoading || !data) {
    return (
      <div
        aria-label="Cargando resumen de cobros"
        className="grid overflow-hidden rounded-xl border border-neutral-200 bg-white sm:grid-cols-3"
        role="status"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="min-h-24 animate-pulse border-t border-neutral-200 p-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"
            key={index}
          >
            <div className="h-3 w-24 rounded bg-neutral-200" />
            <div className="mt-4 h-7 w-32 rounded bg-neutral-200" />
          </div>
        ))}
      </div>
    );
  }

  const tiles = [
    { label: 'Cobros (14 días)', value: String(data.totals.count), signal: false },
    {
      label: 'Total registrado',
      value: formatCurrency(data.totals.amount, data.totals.currency),
      signal: true,
    },
    {
      label: 'Promedio por cobro',
      value: formatCurrency(data.totals.average, data.totals.currency),
      signal: false,
    },
  ];

  return (
    <div
      aria-label="Resumen de los últimos 14 días"
      className="grid overflow-hidden rounded-xl border border-neutral-200 bg-white sm:grid-cols-3"
    >
      {tiles.map((tile) => (
        <div
          className="border-t border-neutral-200 px-4 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-5 sm:first:border-l-0"
          key={tile.label}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {tile.label}
          </p>
          <p
            className={`financial-value mt-2 text-2xl font-semibold ${tile.signal ? 'signal-value' : 'text-neutral-950'}`}
          >
            {tile.value}
          </p>
        </div>
      ))}
    </div>
  );
}
