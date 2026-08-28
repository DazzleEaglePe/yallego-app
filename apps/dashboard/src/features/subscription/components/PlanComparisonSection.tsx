'use client';

import type { BillingCycle, PlanSummary } from '@yallego/contracts';
import { useState } from 'react';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import { usePlans } from '../hooks/use-subscription';
import { billingCycleLabels, planLimitLabel, planPriceForCycle } from '../subscription-config';

const billingCycles = ['MONTHLY', 'SEMIANNUAL', 'ANNUAL'] as const satisfies BillingCycle[];

export function PlanComparisonSection({
  currentCycle,
  currentPlanCode,
}: Readonly<{ currentCycle: BillingCycle; currentPlanCode: string }>) {
  const [cycle, setCycle] = useState<BillingCycle>(currentCycle);
  const plans = usePlans();

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            Opciones disponibles
          </p>
          <h2 className="mt-2 text-xl font-bold text-neutral-950">Compara los planes</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
            Revisa precios y capacidades antes de solicitar un cambio de membresía.
          </p>
        </div>
        <div
          aria-label="Ciclo de facturación"
          className="inline-flex w-fit rounded-xl bg-neutral-100 p-1"
          role="group"
        >
          {billingCycles.map((option) => (
            <button
              aria-pressed={cycle === option}
              className={
                cycle === option
                  ? 'rounded-lg bg-white px-3 py-2 text-xs font-semibold text-neutral-950 shadow-sm'
                  : 'rounded-lg px-3 py-2 text-xs font-medium text-neutral-500 transition hover:text-neutral-800'
              }
              key={option}
              onClick={() => setCycle(option)}
              type="button"
            >
              {billingCycleLabels[option]}
            </button>
          ))}
        </div>
      </div>

      {plans.isLoading && <PlansSkeleton />}

      {plans.isError && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-4">
          <p className="text-sm text-danger-700">No pudimos cargar el catálogo de planes.</p>
          <button
            className="text-sm font-semibold text-danger-700"
            onClick={() => void plans.refetch()}
            type="button"
          >
            Reintentar
          </button>
        </div>
      )}

      {plans.data && (
        <div className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {plans.data.map((plan) => (
            <PlanCard
              cycle={cycle}
              isCurrent={plan.code === currentPlanCode}
              key={plan.code}
              plan={plan}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PlanCard({
  cycle,
  isCurrent,
  plan,
}: Readonly<{ cycle: BillingCycle; isCurrent: boolean; plan: PlanSummary }>) {
  const price = planPriceForCycle(plan, cycle);

  return (
    <article
      className={
        isCurrent
          ? 'relative rounded-2xl border-2 border-brand-500 bg-brand-50/40 p-5'
          : 'relative rounded-2xl border border-neutral-200 bg-white p-5'
      }
    >
      {isCurrent && (
        <span className="absolute right-4 top-4 rounded-full bg-brand-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Plan actual
        </span>
      )}
      <div className="pr-20">
        <h3 className="text-lg font-bold text-neutral-950">{plan.display_name}</h3>
        <p className="mt-1 min-h-10 text-xs leading-5 text-neutral-500">
          {plan.description ?? 'Una opción diseñada para el crecimiento de tu negocio.'}
        </p>
      </div>

      <div className="mt-5 min-h-14">
        {price === null ? (
          <p className="text-sm font-semibold text-neutral-400">No disponible en este ciclo</p>
        ) : (
          <>
            <p className="text-2xl font-bold tracking-tight text-neutral-950">
              {formatMoney(price, plan.currency)}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              por ciclo {billingCycleLabels[cycle].toLowerCase()}
            </p>
          </>
        )}
      </div>

      <div className="mt-5 space-y-3 border-t border-neutral-200 pt-5">
        <ComparisonItem
          label={`${planLimitLabel(plan.limits.transactions_per_month)} cobros al mes`}
        />
        <ComparisonItem label={`${planLimitLabel(plan.limits.devices)} dispositivos`} />
        <ComparisonItem label={`${planLimitLabel(plan.limits.users)} usuarios`} />
        <ComparisonItem
          enabled={plan.limits.webhooks !== 0}
          label={
            plan.limits.webhooks === 0
              ? 'Sin webhooks'
              : `${planLimitLabel(plan.limits.webhooks)} webhooks`
          }
        />
        <ComparisonItem label={`${planLimitLabel(plan.limits.retention_days)} días de retención`} />
        <ComparisonItem
          enabled={plan.limits.websocket_api}
          label="Actualizaciones en tiempo real"
        />
      </div>
    </article>
  );
}

function ComparisonItem({ enabled = true, label }: Readonly<{ enabled?: boolean; label: string }>) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={
          enabled
            ? 'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success-100 text-success-700'
            : 'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-400'
        }
      >
        <DashboardIcon className="h-2.5 w-2.5" name={enabled ? 'check' : 'x'} />
      </span>
      <span className={enabled ? 'text-xs text-neutral-600' : 'text-xs text-neutral-400'}>
        {label}
      </span>
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div className="mt-7 grid animate-pulse gap-4 md:grid-cols-2 2xl:grid-cols-4" role="status">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="h-80 rounded-2xl bg-neutral-100" key={index} />
      ))}
      <span className="sr-only">Cargando planes…</span>
    </div>
  );
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat('es-PE', { currency, style: 'currency' }).format(Number(value));
}
