'use client';

import { useEffect, useState } from 'react';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import type { TransactionFilters } from '../api/transactions';

const WALLET_OPTIONS = [
  { code: '', label: 'Todas las billeteras' },
  { code: 'YAPE', label: 'Yape' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'CAPTURED', label: 'Por revisar' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'DISPUTED', label: 'Disputado' },
  { value: 'VOIDED', label: 'Anulado' },
];

interface FiltersBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function FiltersBar({ filters, onChange }: Readonly<FiltersBarProps>) {
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Búsqueda incremental con un pequeño retraso, sin disparar una solicitud por tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft !== (filters.search ?? '')) {
        onChange({ ...filters, search: searchDraft || undefined });
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // Se ejecuta solo cuando cambia el texto de búsqueda: `filters`/`onChange`
    // cambian en cada tecleo y no deben reiniciar el temporizador.
  }, [searchDraft]);

  const hasActiveFilters = Boolean(
    filters.wallet_code ||
    filters.status ||
    filters.search ||
    filters.from ||
    filters.to ||
    filters.min_amount !== undefined ||
    filters.max_amount !== undefined,
  );
  const advancedFilterCount = [
    filters.from,
    filters.to,
    filters.min_amount,
    filters.max_amount,
  ].filter((value) => value !== undefined).length;

  function clearAll() {
    setSearchDraft('');
    setShowAdvancedFilters(false);
    onChange({});
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_170px_auto_auto]">
        <div className="relative md:col-span-2 xl:col-span-1">
          <DashboardIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
            name="search"
          />
          <input
            aria-label="Buscar por nombre del remitente"
            className="h-10 w-full rounded-lg border border-white/10 bg-neutral-900/50 pl-9 pr-3 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 hover:border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Buscar remitente…"
            type="search"
            value={searchDraft}
          />
        </div>

        <select
          aria-label="Filtrar por billetera"
          className="h-10 min-w-0 rounded-lg border border-white/10 bg-neutral-900/50 px-3 text-sm text-neutral-300 outline-none transition hover:border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
          onChange={(event) =>
            onChange({ ...filters, wallet_code: event.target.value || undefined })
          }
          value={filters.wallet_code ?? ''}
        >
          {WALLET_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por estado"
          className="h-10 min-w-0 rounded-lg border border-white/10 bg-neutral-900/50 px-3 text-sm text-neutral-300 outline-none transition hover:border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
          onChange={(event) => onChange({ ...filters, status: event.target.value || undefined })}
          value={filters.status ?? ''}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          aria-controls="transaction-advanced-filters"
          aria-expanded={showAdvancedFilters}
          className="group flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-neutral-900/50 px-3 text-sm font-medium text-neutral-300 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-400/20"
          onClick={() => setShowAdvancedFilters((visible) => !visible)}
          type="button"
        >
          Más filtros
          {advancedFilterCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
              {advancedFilterCount}
            </span>
          )}
          <DashboardIcon
            className={`h-3.5 w-3.5 transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`}
            name="chevron-right"
          />
        </button>

        {hasActiveFilters && (
          <button
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-neutral-400 transition hover:bg-white/[0.05] hover:text-white"
            onClick={clearAll}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
            Limpiar
          </button>
        )}
      </div>

      {showAdvancedFilters && (
        <div
          className="mt-3 grid gap-3 border-t border-white/10 pt-3 sm:grid-cols-2 xl:grid-cols-4"
          id="transaction-advanced-filters"
        >
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-500">
              Desde
            </span>
            <input
              className="h-10 w-full rounded-lg border border-white/10 bg-neutral-900/50 px-3 text-sm text-neutral-300 outline-none transition hover:border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              onChange={(event) =>
                onChange({
                  ...filters,
                  from: event.target.value ? `${event.target.value}T00:00:00.000Z` : undefined,
                })
              }
              type="date"
              value={filters.from?.slice(0, 10) ?? ''}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-500">
              Hasta
            </span>
            <input
              className="h-10 w-full rounded-lg border border-white/10 bg-neutral-900/50 px-3 text-sm text-neutral-300 outline-none transition hover:border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              onChange={(event) =>
                onChange({
                  ...filters,
                  to: event.target.value ? `${event.target.value}T23:59:59.999Z` : undefined,
                })
              }
              type="date"
              value={filters.to?.slice(0, 10) ?? ''}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-500">
              Monto mínimo
            </span>
            <input
              className="h-10 w-full rounded-lg border border-white/10 bg-neutral-900/50 px-3 text-sm text-neutral-300 outline-none transition placeholder:text-neutral-600 hover:border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              min={0}
              onChange={(event) =>
                onChange({
                  ...filters,
                  min_amount: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              placeholder="S/ 0.00"
              type="number"
              value={filters.min_amount ?? ''}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-500">
              Monto máximo
            </span>
            <input
              className="h-10 w-full rounded-lg border border-white/10 bg-neutral-900/50 px-3 text-sm text-neutral-300 outline-none transition placeholder:text-neutral-600 hover:border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
              min={0}
              onChange={(event) =>
                onChange({
                  ...filters,
                  max_amount: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              placeholder="S/ 0.00"
              type="number"
              value={filters.max_amount ?? ''}
            />
          </label>
        </div>
      )}
    </div>
  );
}
