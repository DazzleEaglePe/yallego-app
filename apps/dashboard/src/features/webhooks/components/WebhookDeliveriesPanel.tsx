'use client';

import type { DeliveryStatus, WebhookDeliverySummary } from '@yallego/contracts';
import { useState } from 'react';

import { ApiRequestError } from '@/features/auth/api';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import { useRetryWebhookDelivery, useWebhookDeliveries } from '../hooks/use-webhooks';
import {
  canRetryDelivery,
  deliveryStatusMeta,
  deliveryStatusOptions,
  webhookEventLabel,
} from '../webhook-config';

export function WebhookDeliveriesPanel({ webhookId }: Readonly<{ webhookId: string }>) {
  const [status, setStatus] = useState<DeliveryStatus | undefined>();
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const deliveries = useWebhookDeliveries(webhookId, status, true);
  const retry = useRetryWebhookDelivery(webhookId);
  const deliveryList = deliveries.data?.data ?? [];

  return (
    <div className="border-t border-neutral-100 bg-neutral-50/70 px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">Historial de entregas</h4>
          <p className="mt-0.5 text-xs text-neutral-500">
            Últimas 50 entregas. Los estados activos se actualizan automáticamente.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-neutral-500">
          Estado
          <select
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            onChange={(event) => {
              setExpandedDeliveryId(null);
              setStatus((event.target.value || undefined) as DeliveryStatus | undefined);
            }}
            value={status ?? ''}
          >
            {deliveryStatusOptions.map((option) => (
              <option key={option.value ?? 'ALL'} value={option.value ?? ''}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <p
          className="mt-4 rounded-lg bg-success-50 px-3 py-2 text-xs font-medium text-success-700"
          role="status"
        >
          {notice}
        </p>
      )}
      {retry.error && (
        <p
          className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-xs font-medium text-danger-700"
          role="alert"
        >
          {errorMessage(retry.error)}
        </p>
      )}

      {deliveries.isLoading && <DeliveriesSkeleton />}

      {deliveries.isError && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-danger-100 bg-white px-4 py-4">
          <p className="text-xs text-danger-600">No pudimos cargar las entregas.</p>
          <button
            className="text-xs font-semibold text-brand-600"
            onClick={() => void deliveries.refetch()}
            type="button"
          >
            Reintentar
          </button>
        </div>
      )}

      {!deliveries.isLoading && !deliveries.isError && deliveryList.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-neutral-700">No hay entregas con este estado.</p>
          <p className="mt-1 text-xs text-neutral-400">
            Envía un evento de prueba o espera el siguiente evento suscrito.
          </p>
        </div>
      )}

      {!deliveries.isLoading && !deliveries.isError && deliveryList.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {deliveryList.map((delivery) => (
            <DeliveryRow
              delivery={delivery}
              isExpanded={expandedDeliveryId === delivery.id}
              isRetrying={retry.isPending && retry.variables === delivery.id}
              key={delivery.id}
              onRetry={() => {
                setNotice(null);
                retry.reset();
                retry.mutate(delivery.id, {
                  onSuccess: () => setNotice('Reintento encolado correctamente.'),
                });
              }}
              onToggle={() =>
                setExpandedDeliveryId((current) => (current === delivery.id ? null : delivery.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryRow({
  delivery,
  isExpanded,
  isRetrying,
  onRetry,
  onToggle,
}: Readonly<{
  delivery: WebhookDeliverySummary;
  isExpanded: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  onToggle: () => void;
}>) {
  const status = deliveryStatusMeta[delivery.status];

  return (
    <article className="border-b border-neutral-100 last:border-b-0">
      <button
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
        onClick={onToggle}
        type="button"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500">
          <DashboardIcon className="h-4 w-4" name="refresh" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-neutral-800">
            {webhookEventLabel(delivery.event_type)}
          </span>
          <span className="mt-0.5 block text-[11px] text-neutral-400">
            {formatDateTime(delivery.created_at)} · {delivery.attempts}/{delivery.max_attempts}{' '}
            intentos
          </span>
        </span>
        {delivery.last_status_code && (
          <span className="hidden text-xs font-medium text-neutral-500 sm:inline">
            HTTP {delivery.last_status_code}
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
          {status.label}
        </span>
        <span
          aria-hidden="true"
          className={`text-neutral-400 transition ${isExpanded ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-100 bg-neutral-50/70 px-4 py-4">
          <dl className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="ID del evento" value={delivery.event_id} />
            <Detail label="Último intento" value={formatOptionalDate(delivery.last_attempt_at)} />
            <Detail label="Próximo intento" value={formatOptionalDate(delivery.next_attempt_at)} />
            <Detail label="Entregada" value={formatOptionalDate(delivery.delivered_at)} />
            <Detail
              label="Respuesta HTTP"
              value={
                delivery.last_status_code ? String(delivery.last_status_code) : 'Sin respuesta'
              }
            />
            <Detail label="Intentos" value={`${delivery.attempts} de ${delivery.max_attempts}`} />
          </dl>
          {delivery.last_error && (
            <div className="mt-4 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-danger-500">
                Último error
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-danger-700">
                {delivery.last_error}
              </p>
            </div>
          )}
          {canRetryDelivery(delivery.status) && (
            <div className="mt-4 flex justify-end">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                disabled={isRetrying}
                onClick={onRetry}
                type="button"
              >
                <DashboardIcon className="h-3.5 w-3.5" name="refresh" />
                {isRetrying ? 'Encolando…' : 'Reintentar ahora'}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
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

function DeliveriesSkeleton() {
  return (
    <div
      className="mt-4 animate-pulse space-y-px overflow-hidden rounded-xl border border-neutral-200 bg-white"
      role="status"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div className="flex items-center gap-3 px-4 py-3" key={index}>
          <span className="h-8 w-8 rounded-lg bg-neutral-100" />
          <span className="h-3 flex-1 rounded bg-neutral-100" />
          <span className="h-5 w-20 rounded-full bg-neutral-100" />
        </div>
      ))}
      <span className="sr-only">Cargando entregas…</span>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null): string {
  return value ? formatDateTime(value) : 'No programado';
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  return 'No pudimos encolar el reintento. Inténtalo nuevamente.';
}
