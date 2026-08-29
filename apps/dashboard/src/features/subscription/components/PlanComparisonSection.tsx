'use client';

import type {
  BillingCycle,
  PlanSummary,
  SubscriptionChangeRequestResponse,
} from '@yallego/contracts';
import { type ReactNode, useState } from 'react';

import { ApiRequestError } from '@/features/auth/api';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import { usePlans, useRequestSubscriptionChange } from '../hooks/use-subscription';
import {
  billingCycleLabels,
  canRequestPlanChange,
  planLimitLabel,
  planPriceForCycle,
} from '../subscription-config';

const billingCycles = ['MONTHLY', 'SEMIANNUAL', 'ANNUAL'] as const satisfies BillingCycle[];

export function PlanComparisonSection({
  currentCycle,
  currentPlanCode,
}: Readonly<{ currentCycle: BillingCycle; currentPlanCode: string }>) {
  const [cycle, setCycle] = useState<BillingCycle>(currentCycle);
  const [selectedPlan, setSelectedPlan] = useState<PlanSummary | null>(null);
  const [changeResult, setChangeResult] = useState<SubscriptionChangeRequestResponse | null>(null);
  const plans = usePlans();
  const requestChange = useRequestSubscriptionChange();

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
      {plans.isError && <PlansError onRetry={() => void plans.refetch()} />}

      {plans.data && (
        <div className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {plans.data.map((plan) => (
            <PlanCard
              cycle={cycle}
              currentPlanCode={currentPlanCode}
              isCurrent={plan.code === currentPlanCode}
              key={plan.code}
              onSelect={() => {
                requestChange.reset();
                setSelectedPlan(plan);
              }}
              plan={plan}
            />
          ))}
        </div>
      )}

      {selectedPlan && (
        <ConfirmPlanChangeDialog
          cycle={cycle}
          error={requestErrorMessage(requestChange.error)}
          isPending={requestChange.isPending}
          onCancel={() => setSelectedPlan(null)}
          onConfirm={() =>
            requestChange.mutate(
              { billing_cycle: cycle, plan_code: selectedPlan.code },
              {
                onSuccess: (result) => {
                  setSelectedPlan(null);
                  setChangeResult(result);
                },
              },
            )
          }
          plan={selectedPlan}
        />
      )}

      {changeResult && (
        <PlanChangeResultDialog onClose={() => setChangeResult(null)} result={changeResult} />
      )}
    </section>
  );
}

function PlanCard({
  cycle,
  currentPlanCode,
  isCurrent,
  onSelect,
  plan,
}: Readonly<{
  cycle: BillingCycle;
  currentPlanCode: string;
  isCurrent: boolean;
  onSelect: () => void;
  plan: PlanSummary;
}>) {
  const price = planPriceForCycle(plan, cycle);
  const canSelect = canRequestPlanChange(plan, currentPlanCode, cycle);

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

      <button
        className={
          canSelect
            ? 'mt-6 w-full rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-200'
            : 'mt-6 w-full cursor-default rounded-xl bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-400'
        }
        disabled={!canSelect}
        onClick={onSelect}
        type="button"
      >
        {isCurrent ? 'Plan actual' : price === null ? 'Ciclo no disponible' : 'Solicitar cambio'}
      </button>
    </article>
  );
}

function ConfirmPlanChangeDialog({
  cycle,
  error,
  isPending,
  onCancel,
  onConfirm,
  plan,
}: Readonly<{
  cycle: BillingCycle;
  error?: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  plan: PlanSummary;
}>) {
  const price = planPriceForCycle(plan, cycle);

  return (
    <DialogFrame labelledBy="confirm-plan-change-title">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <DashboardIcon className="h-5 w-5" name="ticket" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-neutral-950" id="confirm-plan-change-title">
        Solicitar plan {plan.display_name}
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        Confirma el ciclo {billingCycleLabels[cycle].toLowerCase()} por{' '}
        <strong className="font-semibold text-neutral-800">
          {price ? formatMoney(price, plan.currency) : '—'}
        </strong>
        . Tu membresía se actualizará cuando administración confirme el pago.
      </p>
      <div className="mt-4 rounded-xl bg-neutral-50 px-4 py-3 text-xs leading-5 text-neutral-500">
        Esta solicitud sólo genera el monto y la referencia de transferencia. No realiza ningún
        cobro automático.
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          disabled={isPending}
          onClick={onConfirm}
          type="button"
        >
          {isPending ? 'Generando referencia…' : 'Confirmar solicitud'}
        </button>
      </div>
    </DialogFrame>
  );
}

function PlanChangeResultDialog({
  onClose,
  result,
}: Readonly<{ onClose: () => void; result: SubscriptionChangeRequestResponse }>) {
  const [copied, setCopied] = useState(false);

  async function copyReference() {
    await navigator.clipboard.writeText(result.payment_instructions.reference);
    setCopied(true);
  }

  return (
    <DialogFrame labelledBy="plan-change-result-title">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-success-50 text-success-600">
        <DashboardIcon className="h-5 w-5" name="check" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-neutral-950" id="plan-change-result-title">
        Solicitud generada
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">{result.message}</p>

      <dl className="mt-5 overflow-hidden rounded-xl border border-neutral-200">
        <ResultRow label="Plan solicitado" value={result.requested_plan} />
        <ResultRow label="Ciclo" value={billingCycleLabels[result.billing_cycle]} />
        <ResultRow label="Monto" value={formatMoney(result.amount_due, result.currency)} />
      </dl>

      <div className="mt-4 rounded-xl bg-neutral-950 p-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Referencia de transferencia
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <code className="break-all text-base font-bold tracking-wide">
            {result.payment_instructions.reference}
          </code>
          <button
            className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/15"
            onClick={() => void copyReference()}
            type="button"
          >
            {copied ? 'Copiada' : 'Copiar'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-neutral-500">
        Conserva esta referencia y úsala al coordinar la transferencia. El cambio se reflejará
        después de la confirmación manual del pago.
      </p>
      <button
        className="mt-6 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        onClick={onClose}
        type="button"
      >
        Entendido
      </button>
    </DialogFrame>
  );
}

function DialogFrame({
  children,
  labelledBy,
}: Readonly<{ children: ReactNode; labelledBy: string }>) {
  return (
    <div
      aria-labelledby={labelledBy}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ResultRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-4 py-3 last:border-b-0">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-neutral-800">{value}</dd>
    </div>
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

function PlansError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-danger-100 bg-danger-50 px-4 py-4">
      <p className="text-sm text-danger-700">No pudimos cargar el catálogo de planes.</p>
      <button className="text-sm font-semibold text-danger-700" onClick={onRetry} type="button">
        Reintentar
      </button>
    </div>
  );
}

function requestErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiRequestError) return error.message;
  return 'No pudimos generar la solicitud. Inténtalo nuevamente.';
}

function formatMoney(value: string, currency: string): string {
  return new Intl.NumberFormat('es-PE', { currency, style: 'currency' }).format(Number(value));
}
