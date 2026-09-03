'use client';

import { can, type AuditEventSummary } from '@yallego/contracts';
import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiRequestError } from '@/features/auth/api';
import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import type { AuditFilters } from '@/features/audit/api/audit';
import {
  auditActionLabel,
  auditActionOptions,
  auditActorLabel,
  auditResourceLabel,
  auditResourceOptions,
} from '@/features/audit/audit-config';
import { useAuditEvents, useExportAudit } from '@/features/audit/hooks/use-audit';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

const initialFilters: AuditFilters = { limit: 30 };

export default function AuditPage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role;
  const hasAccess = role !== undefined && can(role, 'audit:view');
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [draft, setDraft] = useState<AuditFilters>(initialFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const audit = useAuditEvents(filters);
  const exportAudit = useExportAudit();

  useEffect(() => {
    if (role !== undefined && !hasAccess) router.replace('/inicio');
  }, [hasAccess, role, router]);

  if (!hasAccess) return null;

  const events = audit.data?.pages.flatMap((page) => page.data) ?? [];
  const error = requestErrorMessage(audit.error ?? exportAudit.error);

  return (
    <div className="pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-500" name="shield" />
            <p className="text-sm font-semibold text-brand-600">Seguridad</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
            Auditoría
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Consulta las acciones sensibles realizadas en tu negocio y exporta el registro.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
          disabled={exportAudit.isPending}
          onClick={() => exportAudit.mutate({ ...filters, cursor: undefined, limit: undefined })}
          type="button"
        >
          <DashboardIcon className="h-4 w-4" name="download" />
          {exportAudit.isPending ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </section>

      <AuditFiltersBar
        draft={draft}
        onApply={(next) => {
          setExpandedId(null);
          setFilters({ ...next, limit: 30 });
        }}
        onDraftChange={setDraft}
      />

      {error && (
        <p
          className="mt-5 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">Registro de actividad</h2>
            <p className="mt-1 text-xs text-neutral-500">Ordenado desde el evento más reciente.</p>
          </div>
          {!audit.isLoading && (
            <span className="text-xs text-neutral-400">{events.length} visibles</span>
          )}
        </div>

        {audit.isLoading && <AuditSkeleton />}
        {audit.isError && events.length === 0 && <LoadError onRetry={() => void audit.refetch()} />}
        {!audit.isLoading && !audit.isError && events.length === 0 && <EmptyAudit />}

        {events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead className="bg-neutral-50 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                <tr>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Acción</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Recurso</th>
                  <th className="w-12 px-5 py-3">
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {events.map((event) => (
                  <Fragment key={event.id}>
                    <AuditRow
                      event={event}
                      isExpanded={expandedId === event.id}
                      onToggle={() =>
                        setExpandedId((current) => (current === event.id ? null : event.id))
                      }
                    />
                    {expandedId === event.id && <AuditDetailRow event={event} />}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {audit.hasNextPage && (
          <div className="border-t border-neutral-100 px-5 py-4 text-center">
            <button
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
              disabled={audit.isFetchingNextPage}
              onClick={() => void audit.fetchNextPage()}
              type="button"
            >
              {audit.isFetchingNextPage ? 'Cargando…' : 'Cargar más eventos'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function AuditFiltersBar({
  draft,
  onApply,
  onDraftChange,
}: Readonly<{
  draft: AuditFilters;
  onApply: (filters: AuditFilters) => void;
  onDraftChange: (filters: AuditFilters) => void;
}>) {
  const hasFilters = Boolean(
    draft.action || draft.actor_user_id || draft.from || draft.resource_type || draft.to,
  );

  return (
    <form
      className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filtrar por acción"
          className="h-10 min-w-52 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) => onDraftChange({ ...draft, action: event.target.value || undefined })}
          value={draft.action ?? ''}
        >
          <option value="">Todas las acciones</option>
          {auditActionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por recurso"
          className="h-10 min-w-44 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) =>
            onDraftChange({ ...draft, resource_type: event.target.value || undefined })
          }
          value={draft.resource_type ?? ''}
        >
          <option value="">Todos los recursos</option>
          {auditResourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          aria-label="Desde"
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) =>
            onDraftChange({
              ...draft,
              from: event.target.value ? `${event.target.value}T00:00:00.000Z` : undefined,
            })
          }
          type="date"
          value={draft.from?.slice(0, 10) ?? ''}
        />
        <input
          aria-label="Hasta"
          className="h-10 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) =>
            onDraftChange({
              ...draft,
              to: event.target.value ? `${event.target.value}T23:59:59.999Z` : undefined,
            })
          }
          type="date"
          value={draft.to?.slice(0, 10) ?? ''}
        />
        <input
          aria-label="ID del usuario actor"
          className="h-10 min-w-56 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          onChange={(event) =>
            onDraftChange({ ...draft, actor_user_id: event.target.value.trim() || undefined })
          }
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
          placeholder="ID exacto del usuario"
          value={draft.actor_user_id ?? ''}
        />
        <button
          className="h-10 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
          type="submit"
        >
          Aplicar
        </button>
        {hasFilters && (
          <button
            className="h-10 rounded-lg px-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100"
            onClick={() => {
              onDraftChange(initialFilters);
              onApply(initialFilters);
            }}
            type="button"
          >
            Limpiar
          </button>
        )}
      </div>
    </form>
  );
}

function AuditRow({
  event,
  isExpanded,
  onToggle,
}: Readonly<{ event: AuditEventSummary; isExpanded: boolean; onToggle: () => void }>) {
  return (
    <tr className="text-sm text-neutral-600 transition hover:bg-neutral-50">
      <td className="whitespace-nowrap px-5 py-4 text-xs text-neutral-500">
        {formatDateTime(event.created_at)}
      </td>
      <td className="px-5 py-4">
        <span className="font-semibold text-neutral-900">{auditActionLabel(event.action)}</span>
        <span className="mt-0.5 block text-[11px] text-neutral-400">{event.action}</span>
      </td>
      <td className="px-5 py-4">
        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
          {auditActorLabel(event.actor_type)}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="text-xs font-medium text-neutral-700">
          {auditResourceLabel(event.resource_type)}
        </span>
        {event.resource_id && (
          <span className="mt-0.5 block max-w-48 truncate text-[11px] text-neutral-400">
            {event.resource_id}
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        <button
          aria-expanded={isExpanded}
          aria-label="Mostrar detalle"
          className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          onClick={onToggle}
          type="button"
        >
          <span className={isExpanded ? 'rotate-90 transition' : 'transition'}>›</span>
        </button>
      </td>
    </tr>
  );
}

function AuditDetailRow({ event }: Readonly<{ event: AuditEventSummary }>) {
  return (
    <tr className="bg-neutral-50/80">
      <td className="px-5 py-5" colSpan={5}>
        <dl className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="ID del evento" value={event.id} />
          <Detail label="Usuario actor" value={event.actor_user_id ?? 'No aplica'} />
          <Detail label="Clave de API" value={event.actor_api_key_id ?? 'No aplica'} />
          <Detail label="Dirección IP" value={event.ip_address ?? 'No registrada'} />
        </dl>
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-4 rounded-xl bg-neutral-950 p-4 text-neutral-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Metadatos
            </p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}
      </td>
    </tr>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-1 break-all font-medium text-neutral-700">{value}</dd>
    </div>
  );
}

function AuditSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-neutral-100" role="status">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="flex gap-5 px-6 py-5" key={index}>
          <span className="h-3 w-32 rounded bg-neutral-100" />
          <span className="h-3 flex-1 rounded bg-neutral-100" />
          <span className="h-3 w-24 rounded bg-neutral-100" />
        </div>
      ))}
      <span className="sr-only">Cargando auditoría…</span>
    </div>
  );
}

function EmptyAudit() {
  return (
    <div className="px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">
        <DashboardIcon className="h-5 w-5" name="shield" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-neutral-950">
        No hay eventos para estos filtros
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        Prueba con otro período o elimina algunos filtros.
      </p>
    </div>
  );
}

function LoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-10">
      <p className="text-sm text-danger-700">No pudimos cargar el registro.</p>
      <button className="text-sm font-semibold text-brand-600" onClick={onRetry} type="button">
        Reintentar
      </button>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function requestErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiRequestError) return error.message;
  return 'No pudimos completar la operación. Inténtalo nuevamente.';
}
