'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import { useSubscription } from '../hooks/use-subscription';
import { subscriptionUsageAlert } from '../subscription-config';

export function SubscriptionUsageNotice({
  enabled,
  tenantId,
}: Readonly<{ enabled: boolean; tenantId?: string }>) {
  const subscription = useSubscription(enabled);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [dismissalLoaded, setDismissalLoaded] = useState(false);

  const data = subscription.data;
  const limit = data?.plan.limits.transactions_per_month ?? 0;
  const current = data?.usage.transactions_count ?? 0;
  const level = data ? subscriptionUsageAlert(current, limit) : null;
  const storageKey =
    level === 'warning' && tenantId && data
      ? `yallego:usage-warning:${tenantId}:${data.period_start}`
      : null;

  useEffect(() => {
    if (!storageKey) {
      setDismissalLoaded(true);
      return;
    }
    setDismissedKey(window.localStorage.getItem(storageKey) === 'dismissed' ? storageKey : null);
    setDismissalLoaded(true);
  }, [storageKey]);

  if (!enabled || !data || !level) return null;
  if (level === 'warning' && (!dismissalLoaded || dismissedKey === storageKey)) return null;

  const isCritical = level === 'critical';

  return (
    <aside
      className={
        isCritical
          ? 'mb-5 flex flex-col gap-4 rounded-2xl border border-danger-200 bg-danger-50 px-5 py-4 sm:flex-row sm:items-center'
          : 'mb-5 flex flex-col gap-4 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-4 sm:flex-row sm:items-center'
      }
      role={isCritical ? 'alert' : 'status'}
    >
      <span
        className={
          isCritical
            ? 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger-100 text-danger-700'
            : 'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-100 text-warning-700'
        }
      >
        <DashboardIcon className="h-5 w-5" name="alert-circle" />
      </span>
      <div className="min-w-0 flex-1">
        <h2
          className={
            isCritical ? 'text-sm font-bold text-danger-800' : 'text-sm font-bold text-warning-800'
          }
        >
          {isCritical ? 'Alcanzaste el límite mensual' : 'Estás cerca del límite mensual'}
        </h2>
        <p
          className={
            isCritical
              ? 'mt-1 text-sm leading-6 text-danger-700'
              : 'mt-1 text-sm leading-6 text-warning-700'
          }
        >
          {isCritical
            ? `Procesaste ${formatNumber(current)} de ${formatNumber(limit)} cobros. El límite se renueva el ${formatDate(data.period_end)} o puedes mejorar tu plan.`
            : `Ya utilizaste ${formatNumber(current)} de ${formatNumber(limit)} cobros. Revisa tu consumo antes del ${formatDate(data.period_end)}.`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          className={
            isCritical
              ? 'rounded-xl bg-danger-700 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-danger-800'
              : 'rounded-xl bg-warning-700 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-warning-800'
          }
          href="/membresia"
        >
          Ver membresía
        </Link>
        {!isCritical && storageKey && (
          <button
            aria-label="Descartar aviso de consumo"
            className="grid h-9 w-9 place-items-center rounded-lg text-warning-700 transition hover:bg-warning-100"
            onClick={() => {
              window.localStorage.setItem(storageKey, 'dismissed');
              setDismissedKey(storageKey);
            }}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
          </button>
        )}
      </div>
    </aside>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-PE').format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date(value));
}
