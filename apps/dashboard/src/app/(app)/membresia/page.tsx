'use client';

import { can } from '@yallego/contracts';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { PlanComparisonSection } from '@/features/subscription/components/PlanComparisonSection';
import { useSubscription } from '@/features/subscription/hooks/use-subscription';
import {
  billingCycleLabels,
  planLimitLabel,
  subscriptionPrice,
  usagePercentage,
  usageTone,
} from '@/features/subscription/subscription-config';

export default function MembershipPage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role;
  const hasAccess = role !== undefined && can(role, 'subscription:manage');
  const subscription = useSubscription();

  useEffect(() => {
    if (role !== undefined && !hasAccess) router.replace('/inicio');
  }, [hasAccess, role, router]);

  if (!hasAccess) return null;

  if (subscription.isLoading) return <MembershipSkeleton />;
  if (subscription.isError || !subscription.data) {
    return <LoadError onRetry={() => void subscription.refetch()} />;
  }

  const data = subscription.data;
  const transactionLimit = data.plan.limits.transactions_per_month;
  const transactionUsage = data.usage.transactions_count;
  const hasUnlimitedTransactions = transactionLimit < 0;
  const percentage = usagePercentage(transactionUsage, transactionLimit);
  const tone = usageTone(percentage);
  const price = formatMoney(subscriptionPrice(data), data.plan.currency);
  const status = subscriptionStatusMeta(data.status);

  return (
    <div className="pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-500" name="ticket" />
            <p className="text-sm font-semibold text-brand-600">Cuenta</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
            Membresía
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Revisa tu plan, el consumo del período y los límites disponibles para tu negocio.
          </p>
        </div>
        <span className={status.className}>
          <span className={status.dotClassName} />
          {status.label}
        </span>
      </section>

      {data.pending_plan && (
        <section className="mt-6 flex items-start gap-3 rounded-2xl border border-warning-100 bg-warning-50 px-5 py-4">
          <DashboardIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning-600" name="calendar" />
          <div>
            <h2 className="text-sm font-semibold text-warning-800">Cambio programado</h2>
            <p className="mt-1 text-sm leading-6 text-warning-700">
              Tu membresía cambiará a {data.pending_plan.display_name} al finalizar el período el{' '}
              {formatDate(data.period_end)}.
            </p>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <article className="overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
                Plan actual
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">{data.plan.display_name}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
                {data.plan.description ?? 'Las herramientas esenciales para gestionar tus cobros.'}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-bold">{price}</p>
              <p className="mt-1 text-xs text-neutral-400">
                Ciclo {billingCycleLabels[data.billing_cycle].toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-neutral-400">Período vigente</span>
              <strong className="font-semibold text-white">
                {formatDate(data.period_start)} — {formatDate(data.period_end)}
              </strong>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                Próxima renovación
              </p>
              <p className="mt-2 text-2xl font-bold text-neutral-950">
                {daysUntil(data.period_end)} días
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <DashboardIcon className="h-5 w-5" name="calendar" />
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-neutral-500">
            El contador de consumo se reinicia el {formatDate(data.period_end)}.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Consumo del período</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Seguimiento actualizado de la actividad incluida en tu plan.
            </p>
          </div>
          <span className={usageBadgeClass[tone]}>
            {hasUnlimitedTransactions ? 'Uso ilimitado' : `${percentage}% utilizado`}
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-neutral-800">Cobros procesados</p>
              <p className="mt-1 text-xs text-neutral-500">Límite mensual de transacciones</p>
            </div>
            <p className="text-right text-sm font-semibold text-neutral-950">
              {formatNumber(transactionUsage)}{' '}
              <span className="font-normal text-neutral-400">
                / {planLimitLabel(transactionLimit)}
              </span>
            </p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              aria-label={
                hasUnlimitedTransactions
                  ? `${formatNumber(transactionUsage)} cobros procesados sin límite mensual`
                  : `${percentage}% del límite mensual utilizado`
              }
              aria-valuemax={hasUnlimitedTransactions ? undefined : 100}
              aria-valuemin={hasUnlimitedTransactions ? undefined : 0}
              aria-valuenow={hasUnlimitedTransactions ? undefined : percentage}
              className={`h-full rounded-full transition-all ${usageBarClass[tone]}`}
              role="progressbar"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <UsageStat
            description="Solicitudes autenticadas con tus claves"
            label="Llamadas a la API"
            value={data.usage.api_calls_count}
          />
          <UsageStat
            description="Intentos realizados hacia tus endpoints"
            label="Entregas de webhooks"
            value={data.usage.webhook_calls_count}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
        <div>
          <h2 className="text-lg font-bold text-neutral-950">Incluido en tu plan</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Capacidad disponible para operar tu negocio.
          </p>
        </div>
        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <PlanLimit label="Billeteras" value={data.plan.limits.wallets} />
          <PlanLimit label="Dispositivos" value={data.plan.limits.devices} />
          <PlanLimit label="Usuarios" value={data.plan.limits.users} />
          <PlanLimit label="Webhooks" value={data.plan.limits.webhooks} />
          <PlanLimit label="Retención" suffix=" días" value={data.plan.limits.retention_days} />
          <PlanLimit
            label="API pública"
            value={data.plan.limits.rate_limit_per_minute}
            suffix=" req/min"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-neutral-100 pt-5">
          <FeaturePill enabled={data.plan.limits.websocket_api} label="Tiempo real por WebSocket" />
          <FeaturePill enabled label={`Soporte ${data.plan.limits.support.toLowerCase()}`} />
        </div>
      </section>

      <PlanComparisonSection currentCycle={data.billing_cycle} currentPlanCode={data.plan.code} />
    </div>
  );
}

function UsageStat({
  description,
  label,
  value,
}: Readonly<{ description: string; label: string; value: number }>) {
  return (
    <article className="rounded-xl border border-neutral-200 px-4 py-4">
      <p className="text-2xl font-bold text-neutral-950">{formatNumber(value)}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-700">{label}</p>
      <p className="mt-1 text-xs leading-5 text-neutral-400">{description}</p>
    </article>
  );
}

function PlanLimit({
  label,
  suffix = '',
  value,
}: Readonly<{ label: string; suffix?: string; value: number }>) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success-50 text-success-600">
        <DashboardIcon className="h-4 w-4" name="check" />
      </span>
      <span>
        <span className="block text-xs text-neutral-400">{label}</span>
        <strong className="mt-0.5 block text-sm font-semibold text-neutral-800">
          {planLimitLabel(value, suffix)}
        </strong>
      </span>
    </div>
  );
}

function FeaturePill({ enabled, label }: Readonly<{ enabled: boolean; label: string }>) {
  return (
    <span
      className={
        enabled
          ? 'inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-700'
          : 'inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-500'
      }
    >
      <DashboardIcon className="h-3.5 w-3.5" name={enabled ? 'check' : 'x'} />
      {label}: {enabled ? 'incluido' : 'no incluido'}
    </span>
  );
}

function MembershipSkeleton() {
  return (
    <div className="animate-pulse space-y-6 pb-8" role="status">
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="h-10 w-56 rounded bg-neutral-200" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div className="h-64 rounded-2xl bg-neutral-200" />
        <div className="h-64 rounded-2xl bg-neutral-200" />
      </div>
      <div className="h-80 rounded-2xl bg-neutral-200" />
      <span className="sr-only">Cargando membresía…</span>
    </div>
  );
}

function LoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="rounded-2xl border border-danger-100 bg-white px-6 py-12 text-center shadow-sm">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-danger-50 text-danger-600">
        <DashboardIcon className="h-5 w-5" name="alert-circle" />
      </span>
      <h1 className="mt-4 text-lg font-bold text-neutral-950">No pudimos cargar tu membresía</h1>
      <p className="mt-1 text-sm text-neutral-500">Verifica tu conexión e inténtalo nuevamente.</p>
      <button
        className="mt-5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        onClick={onRetry}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat('es-PE', { currency, style: 'currency' }).format(Number(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-PE').format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value));
}

function daysUntil(value: string): number {
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
}

function subscriptionStatusMeta(status: string): {
  className: string;
  dotClassName: string;
  label: string;
} {
  const baseClassName =
    'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold';
  if (status === 'ACTIVE') {
    return {
      className: `${baseClassName} bg-success-50 text-success-700`,
      dotClassName: 'h-1.5 w-1.5 rounded-full bg-success-500',
      label: 'Membresía activa',
    };
  }
  if (status === 'TRIALING') {
    return {
      className: `${baseClassName} bg-brand-50 text-brand-700`,
      dotClassName: 'h-1.5 w-1.5 rounded-full bg-brand-500',
      label: 'Período de prueba',
    };
  }
  if (status === 'PAST_DUE') {
    return {
      className: `${baseClassName} bg-warning-50 text-warning-700`,
      dotClassName: 'h-1.5 w-1.5 rounded-full bg-warning-500',
      label: 'Pago pendiente',
    };
  }
  return {
    className: `${baseClassName} bg-neutral-100 text-neutral-600`,
    dotClassName: 'h-1.5 w-1.5 rounded-full bg-neutral-400',
    label: status.toLowerCase().replaceAll('_', ' '),
  };
}

const usageBadgeClass = {
  danger: 'w-fit rounded-full bg-danger-50 px-3 py-1.5 text-xs font-semibold text-danger-700',
  success: 'w-fit rounded-full bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-700',
  warning: 'w-fit rounded-full bg-warning-50 px-3 py-1.5 text-xs font-semibold text-warning-700',
} as const;

const usageBarClass = {
  danger: 'bg-danger-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
} as const;
