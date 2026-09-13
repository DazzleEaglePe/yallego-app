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

  const confirmed = data.confirmed_totals ?? {
    amount: '0.00',
    average: '0.00',
    count: 0,
    currency: data.totals.currency,
  };
  const disputedCount = data.by_status?.find(({ status }) => status === 'DISPUTED')?.count ?? 0;
  const tiles = [
    {
      detail:
        disputedCount > 0
          ? `${confirmed.count} confirmada${confirmed.count === 1 ? '' : 's'} · ${disputedCount} disputada${disputedCount === 1 ? '' : 's'}`
          : `${confirmed.count} confirmada${confirmed.count === 1 ? '' : 's'}`,
      label: 'Transacciones detectadas',
      value: String(data.totals.count),
      signal: false,
    },
    {
      detail: 'Solo estados confirmados',
      label: 'Cobrado confirmado',
      value: formatCurrency(confirmed.amount, confirmed.currency),
      signal: true,
    },
    {
      detail: 'Calculado sobre cobros confirmados',
      label: 'Ticket promedio',
      value: formatCurrency(confirmed.average, confirmed.currency),
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
          <p className="mt-1 text-xs text-neutral-500">{tile.detail}</p>
        </div>
      ))}
    </div>
  );
}
