import type { SubscriptionSummary } from '@yallego/contracts';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import { isTrialEnded, trialHoursRemaining, usagePercentage, usageTone } from '../subscription-config';

export function TrialStatusCard({
  limits,
  trial,
}: Readonly<{
  limits: SubscriptionSummary['plan']['limits'];
  trial: NonNullable<SubscriptionSummary['trial']>;
}>) {
  const started = trial.started_at !== null;
  const ended = isTrialEnded(trial);
  const hoursLeft = trialHoursRemaining(trial.ends_at);
  const dailyLimit = limits.transactions_per_day ?? 0;
  const totalLimit = limits.transactions_per_period ?? 0;

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {ended ? 'Prueba gratuita' : started ? 'Tiempo restante de prueba' : 'Prueba gratuita'}
          </p>
          <p className="mt-2 text-2xl font-bold text-neutral-950">
            {ended ? 'Terminó' : started ? `${hoursLeft} h` : 'Por comenzar'}
          </p>
        </div>
        <span
          className={
            ended
              ? 'grid h-11 w-11 place-items-center rounded-xl bg-danger-50 text-danger-600'
              : 'grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600'
          }
        >
          <DashboardIcon className="h-5 w-5" name="calendar" />
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-neutral-500">
        {ended
          ? 'Tu historial sigue disponible en modo lectura. Elige un plan para volver a procesar cobros.'
          : started
            ? 'Al terminar, tu cuenta pasa a modo lectura hasta que elijas un plan.'
            : 'El reloj arranca con tu primer cobro real. Vincula un dispositivo para empezar.'}
      </p>

      <div className="mt-5 space-y-4 border-t border-neutral-100 pt-5">
        <TrialUsageBar current={trial.transactions_today} label="Cobros hoy" limit={dailyLimit} />
        <TrialUsageBar current={trial.transactions_total} label="Cobros de la prueba" limit={totalLimit} />
      </div>
    </article>
  );
}

function TrialUsageBar({
  current,
  label,
  limit,
}: Readonly<{ current: number; label: string; limit: number }>) {
  const percentage = usagePercentage(current, limit);
  const tone = usageTone(percentage);

  return (
    <div>
      <div className="flex items-end justify-between gap-3 text-xs">
        <span className="font-semibold text-neutral-700">{label}</span>
        <span className="text-neutral-500">
          {current} / {limit > 0 ? limit : '—'}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          aria-label={`${percentage}% de ${label.toLowerCase()} utilizado`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={percentage}
          className={`h-full rounded-full transition-all ${usageBarClass[tone]}`}
          role="progressbar"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

const usageBarClass = {
  danger: 'bg-danger-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
} as const;
