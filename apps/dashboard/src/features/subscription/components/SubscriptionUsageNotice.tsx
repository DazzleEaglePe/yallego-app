'use client';

import type { SubscriptionSummary } from '@yallego/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import { useSubscription } from '../hooks/use-subscription';
import { isTrialEnded, subscriptionUsageAlert, trialHoursRemaining } from '../subscription-config';

interface NoticeDescriptor {
  level: 'critical' | 'warning';
  title: string;
  message: string;
  /** `null` = aviso persistente, no descartable (mismo criterio que el 100% mensual de siempre). */
  dismissKey: string | null;
}

export function SubscriptionUsageNotice({
  enabled,
  tenantId,
}: Readonly<{ enabled: boolean; tenantId?: string }>) {
  const subscription = useSubscription(enabled);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [dismissalLoaded, setDismissalLoaded] = useState(false);

  const data = subscription.data;
  const notice = data && tenantId ? computeNotice(data, tenantId) : null;
  const storageKey = notice?.dismissKey ?? null;

  useEffect(() => {
    if (!storageKey) {
      setDismissalLoaded(true);
      return;
    }
    setDismissedKey(window.localStorage.getItem(storageKey) === 'dismissed' ? storageKey : null);
    setDismissalLoaded(true);
  }, [storageKey]);

  if (!enabled || !notice) return null;
  if (storageKey && (!dismissalLoaded || dismissedKey === storageKey)) return null;

  const isCritical = notice.level === 'critical';

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
          {notice.title}
        </h2>
        <p
          className={
            isCritical
              ? 'mt-1 text-sm leading-6 text-danger-700'
              : 'mt-1 text-sm leading-6 text-warning-700'
          }
        >
          {notice.message}
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
          Ver plan
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

function computeNotice(data: SubscriptionSummary, tenantId: string): NoticeDescriptor | null {
  return data.trial
    ? computeTrialNotice(data.trial, data.plan.limits, tenantId)
    : computeMonthlyNotice(data, tenantId);
}

function computeTrialNotice(
  trial: NonNullable<SubscriptionSummary['trial']>,
  limits: SubscriptionSummary['plan']['limits'],
  tenantId: string,
): NoticeDescriptor | null {
  if (isTrialEnded(trial)) {
    return {
      level: 'critical',
      title: 'Tu prueba gratuita terminó',
      message:
        'Tu cuenta y tu historial siguen disponibles en modo lectura. Elige un plan para volver a procesar cobros.',
      dismissKey: null,
    };
  }

  const totalLimit = limits.transactions_per_period ?? 0;
  const totalLevel = subscriptionUsageAlert(trial.transactions_total, totalLimit);
  if (totalLevel) {
    return {
      level: totalLevel,
      title:
        totalLevel === 'critical'
          ? 'Alcanzaste el límite de tu prueba'
          : 'Estás cerca del límite de tu prueba',
      message: `Procesaste ${formatNumber(trial.transactions_total)} de ${formatNumber(totalLimit)} cobros incluidos en la prueba gratuita.`,
      dismissKey: totalLevel === 'warning' ? `yallego:trial-total-warning:${tenantId}` : null,
    };
  }

  const dailyLimit = limits.transactions_per_day ?? 0;
  const dailyLevel = subscriptionUsageAlert(trial.transactions_today, dailyLimit);
  if (dailyLevel) {
    const reachedDailyLimit = dailyLevel === 'critical';
    return {
      level: dailyLevel,
      title: reachedDailyLimit ? 'Alcanzaste el límite diario' : 'Estás cerca del límite diario',
      message: reachedDailyLimit
        ? 'Se reinicia mañana. Mientras tanto, los nuevos cobros quedan en espera en el dispositivo.'
        : `Procesaste ${formatNumber(trial.transactions_today)} de ${formatNumber(dailyLimit)} cobros disponibles hoy.`,
      dismissKey: reachedDailyLimit ? null : `yallego:trial-daily-warning:${tenantId}:${todayKey()}`,
    };
  }

  const hoursLeft = trialHoursRemaining(trial.ends_at);
  if (hoursLeft > 0 && hoursLeft <= 24) {
    return {
      level: 'warning',
      title: 'Tu prueba termina pronto',
      message: `Quedan ${hoursLeft} horas de tu prueba gratuita. Elige un plan para no perder el servicio.`,
      dismissKey: `yallego:trial-ending-warning:${tenantId}`,
    };
  }

  return null;
}

function computeMonthlyNotice(data: SubscriptionSummary, tenantId: string): NoticeDescriptor | null {
  const limit = data.plan.limits.transactions_per_month;
  const current = data.usage.transactions_count;
  const level = subscriptionUsageAlert(current, limit);
  if (!level) return null;

  const isCritical = level === 'critical';
  return {
    level,
    title: isCritical ? 'Alcanzaste el límite mensual' : 'Estás cerca del límite mensual',
    message: isCritical
      ? `Procesaste ${formatNumber(current)} de ${formatNumber(limit)} cobros. El límite se renueva el ${formatDate(data.period_end)} o puedes mejorar tu plan.`
      : `Ya utilizaste ${formatNumber(current)} de ${formatNumber(limit)} cobros. Revisa tu consumo antes del ${formatDate(data.period_end)}.`,
    dismissKey: isCritical ? null : `yallego:usage-warning:${tenantId}:${data.period_start}`,
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-PE').format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(new Date(value));
}
