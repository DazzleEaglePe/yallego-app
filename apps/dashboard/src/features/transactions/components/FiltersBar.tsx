'use client';

import { useEffect, useState } from 'react';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import type { TransactionFilters } from '../api/transactions';

const WALLET_OPTIONS = [
  { code: '', label: 'Todas las billeteras' },
  { code: 'YAPE', label: 'Yape' },
  { code: 'PLIN_BBVA', label: 'Plin · BBVA' },
  { code: 'PLIN_INTERBANK', label: 'Plin · Interbank' },
  { code: 'BIM', label: 'BIM' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'CAPTURED', label: 'Capturado' },
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

  function clearAll() {
    setSearchDraft('');
    onChange({});
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="relative">
        <DashboardIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          name="search"
        />
        <input
          aria-label="Buscar por nombre del remitente"
          className="h-11 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Buscar por nombre del remitente…"
          type="search"
          value={searchDraft}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filtrar por billetera"
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
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
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => onChange({ ...filters, status: event.target.value || undefined })}
          value={filters.status ?? ''}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          aria-label="Desde"
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) =>
            onChange({
              ...filters,
              from: event.target.value ? `${event.target.value}T00:00:00.000Z` : undefined,
            })
          }
          type="date"
          value={filters.from?.slice(0, 10) ?? ''}
        />
        <input
          aria-label="Hasta"
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) =>
            onChange({
              ...filters,
              to: event.target.value ? `${event.target.value}T23:59:59.999Z` : undefined,
            })
          }
          type="date"
          value={filters.to?.slice(0, 10) ?? ''}
        />

        <input
          aria-label="Monto mínimo"
          className="h-10 w-28 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          min={0}
          onChange={(event) =>
            onChange({
              ...filters,
              min_amount: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          placeholder="Mín. S/"
          type="number"
          value={filters.min_amount ?? ''}
        />
        <input
          aria-label="Monto máximo"
          className="h-10 w-28 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          min={0}
          onChange={(event) =>
            onChange({
              ...filters,
              max_amount: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          placeholder="Máx. S/"
          type="number"
          value={filters.max_amount ?? ''}
        />

        {hasActiveFilters && (
          <button
            className="inline-flex items-center gap-1 rounded-lg px-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100"
            onClick={clearAll}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
