'use client';

import { can } from '@yallego/contracts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { PairDeviceDialog } from '@/features/devices/components/PairDeviceDialog';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { fetchTransactions } from '@/features/transactions/api/transactions';
import { StatusBadge } from '@/features/transactions/components/StatusBadge';
import { useRealtimeTransactions } from '@/features/transactions/hooks/use-realtime-transactions';
import { useTransactionSummary } from '@/features/transactions/hooks/use-transaction-summary';
import { useWallets } from '@/features/wallets/hooks/use-wallets';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { formatCurrency, formatElapsed } from '@/shared/lib/format';

const DAY_IN_MS = 24 * 60 * 60 * 1_000;
const DASHBOARD_PERIOD_DAYS = 14;

/** América/Lima no observa horario de verano: UTC-5 todo el año. */
function startOfPeriodLima(days: number): string {
  return `${limaDateKey(new Date(Date.now() - (days - 1) * DAY_IN_MS))}T05:00:00.000Z`;
}

function limaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Lima',
    year: 'numeric',
  }).format(date);
}

function lastPeriodDays(days: number): Array<{ date: string; label: string }> {
  const dayFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    timeZone: 'America/Lima',
    weekday: 'short',
  });

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - 1 - index) * DAY_IN_MS);
    return {
      date: limaDateKey(date),
      label:
        index === days - 1 ? 'Hoy' : dayFormatter.format(date).replaceAll('.', '').replace(',', ''),
    };
  });
}

export default function DashboardHomePage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role;
  const canManageDevices = role !== undefined && can(role, 'devices:manage');
  const canManageWallets = role !== undefined && can(role, 'wallets:manage');
  const [isPairingDialogOpen, setIsPairingDialogOpen] = useState(false);
  const firstName = session?.user.full_name.trim().split(/\s+/)[0] ?? 'equipo';
  const today = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Lima',
    weekday: 'long',
  }).format(new Date());

  const devices = useDevices();
  const { tenantWallets } = useWallets(canManageWallets);
  const periodSummary = useTransactionSummary({
    from: startOfPeriodLima(DASHBOARD_PERIOD_DAYS),
  });
  useRealtimeTransactions();
  const accessToken = session?.accessToken ?? null;
  const recentTransactions = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => fetchTransactions(accessToken!, { limit: 5 }),
    enabled: Boolean(accessToken),
  });

  const deviceList = devices.data ?? [];
  const activeDevices = deviceList.filter((device) => device.status === 'ACTIVE');
  const onlineDevice = activeDevices.find((device) => device.connectivity === 'ONLINE');
  const totals = periodSummary.data?.totals;
  const confirmedTotals = periodSummary.data?.confirmed_totals;
  const disputedCount =
    periodSummary.data?.by_status?.find(({ status }) => status === 'DISPUTED')?.count ?? 0;
  const recentList = recentTransactions.data?.data ?? [];
  const hasAnyDevice = deviceList.length > 0;
  const hasEnabledWallet = (tenantWallets.data ?? []).some((wallet) => wallet.is_enabled);
  const walletConfigurationLoading = canManageWallets && tenantWallets.isLoading;
  const hasFirstTransaction = recentList.length > 0;
  const setupComplete = hasEnabledWallet && hasAnyDevice && hasFirstTransaction;
  const showOnboarding = canManageDevices && !setupComplete;

  const activityAmounts = new Map(
    (periodSummary.data?.confirmed_by_day ?? []).map((row) => [row.date, Number(row.amount)]),
  );
  const activityDays = lastPeriodDays(DASHBOARD_PERIOD_DAYS).map((day) => ({
    ...day,
    amount: activityAmounts.get(day.date) ?? 0,
  }));
  const maxActivity = Math.max(...activityDays.map((day) => day.amount), 0);
  const activityTotal = activityDays.reduce((sum, day) => sum + day.amount, 0);

  const metrics = [
    {
      detail:
        confirmedTotals && confirmedTotals.count > 0
          ? `${confirmedTotals.count} cobro${confirmedTotals.count === 1 ? '' : 's'} confirmado${confirmedTotals.count === 1 ? '' : 's'}`
          : 'Sin cobros confirmados',
      label: `Cobrado (${DASHBOARD_PERIOD_DAYS} días)`,
      signal: true,
      value: confirmedTotals
        ? formatCurrency(confirmedTotals.amount, confirmedTotals.currency)
        : 'S/ 0.00',
    },
    {
      detail:
        totals && totals.count > 0
          ? disputedCount > 0
            ? `${disputedCount} disputada${disputedCount === 1 ? '' : 's'}`
            : 'Sin disputas'
          : 'Esperando el primer cobro',
      label: 'Transacciones detectadas',
      value: String(totals?.count ?? 0),
    },
    {
      detail:
        confirmedTotals && confirmedTotals.count > 0
          ? 'Promedio de cobros confirmados'
          : 'Se calcula con el primer cobro confirmado',
      label: 'Ticket promedio',
      value:
        confirmedTotals && confirmedTotals.count > 0
          ? formatCurrency(confirmedTotals.average, confirmedTotals.currency)
          : 'S/ 0.00',
    },
    {
      detail: hasAnyDevice
        ? `${onlineDevice ? 1 : 0} en línea · ${activeDevices.length} activo${activeDevices.length === 1 ? '' : 's'}`
        : 'Vincula tu primer Android',
      label: 'Dispositivos',
      value: `${activeDevices.length} / ${deviceList.length}`,
    },
  ];

  return (
    <div className="pb-6">
      <section
        className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        data-animate
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
            <span className="first-letter:uppercase">{today}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
            Una vista clara de los cobros y del estado operativo de tu negocio.
          </p>
        </div>

        {canManageDevices && (
          <Button
            className="w-fit"
            disabled={walletConfigurationLoading}
            onClick={() =>
              hasEnabledWallet ? setIsPairingDialogOpen(true) : router.push('/billeteras')
            }
            type="button"
          >
            <DashboardIcon
              className="h-4 w-4"
              name={
                walletConfigurationLoading ? 'activity' : hasEnabledWallet ? 'device' : 'wallet'
              }
            />
            {walletConfigurationLoading
              ? 'Cargando configuración…'
              : hasEnabledWallet
                ? 'Vincular dispositivo'
                : 'Elegir billetera'}
            <DashboardIcon className="h-4 w-4" name="arrow-up-right" />
          </Button>
        )}
      </section>

      <section
        aria-label={`Resumen de los últimos ${DASHBOARD_PERIOD_DAYS} días`}
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <Card className="px-5 py-5" data-animate key={metric.label}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              {metric.label}
            </p>
            <p
              className={`financial-value mt-3 text-2xl font-semibold ${metric.signal ? 'signal-value' : 'text-neutral-950'}`}
            >
              {metric.value}
            </p>
            <p className="mt-1.5 text-xs text-neutral-500">{metric.detail}</p>
          </Card>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.65fr)]">
        <Card className="overflow-hidden" data-animate>
          <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Actividad de cobros</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Importe confirmado durante {DASHBOARD_PERIOD_DAYS} días
              </p>
            </div>
            <span className="financial-value text-sm font-semibold text-neutral-700">
              {formatCurrency(activityTotal.toFixed(2), 'PEN')}
            </span>
          </div>

          <div className="relative h-72 px-5 pb-5 pt-7 sm:px-6">
            <div
              aria-hidden="true"
              className="absolute inset-x-6 bottom-12 top-7 flex flex-col justify-between"
            >
              {[0, 1, 2, 3].map((line) => (
                <span className="block border-t border-dashed border-neutral-200" key={line} />
              ))}
            </div>

            {maxActivity === 0 && !periodSummary.isLoading && (
              <div className="pointer-events-none absolute inset-x-8 top-24 z-10 text-center">
                <p className="text-sm font-semibold text-neutral-700">Aún no hay actividad</p>
                <p className="mt-1 text-xs text-neutral-500">
                  El primer cobro aparecerá aquí en tiempo real.
                </p>
              </div>
            )}

            <div
              className="relative grid h-full items-end gap-1.5 sm:gap-2"
              style={{
                gridTemplateColumns: `repeat(${DASHBOARD_PERIOD_DAYS}, minmax(0, 1fr))`,
              }}
            >
              {activityDays.map((day) => {
                const height =
                  maxActivity > 0
                    ? `${Math.max((day.amount / maxActivity) * 100, day.amount > 0 ? 6 : 1)}%`
                    : '1%';
                return (
                  <div
                    aria-label={`${day.label}: ${formatCurrency(day.amount.toFixed(2), 'PEN')}`}
                    className="group flex h-full min-w-0 flex-col justify-end"
                    key={day.date}
                  >
                    <div className="relative flex h-[calc(100%-28px)] items-end justify-center">
                      <span
                        className={`w-full max-w-8 rounded-t-md transition-colors ${day.amount > 0 ? 'bg-success-500/80 group-hover:bg-success-500' : 'bg-neutral-800'}`}
                        style={{ height }}
                        title={formatCurrency(day.amount.toFixed(2), 'PEN')}
                      />
                    </div>
                    <span className="mt-2 truncate text-center text-[8px] font-medium capitalize text-neutral-500 sm:text-[10px]">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {showOnboarding ? (
          <OnboardingPanel
            hasAnyDevice={hasAnyDevice}
            hasEnabledWallet={hasEnabledWallet}
            hasFirstTransaction={hasFirstTransaction}
          />
        ) : (
          <SystemStatusPanel hasAnyDevice={hasAnyDevice} onlineDevice={Boolean(onlineDevice)} />
        )}
      </section>

      <Card className="mt-4 overflow-hidden" data-animate>
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">Últimas transacciones</h2>
            <p className="mt-1 text-sm text-neutral-500">Cobros detectados recientemente</p>
          </div>
          <Button
            onClick={() => router.push('/transacciones')}
            size="sm"
            type="button"
            variant="ghost"
          >
            Ver todas
            <DashboardIcon className="h-3.5 w-3.5" name="arrow-up-right" />
          </Button>
        </div>

        {recentList.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-neutral-700">Tu historial está listo</p>
            <p className="mt-1 text-sm text-neutral-500">
              Una notificación válida de Yape aparecerá aquí automáticamente.
            </p>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(220px,1fr)_130px_150px_120px] gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 md:grid">
              <span>Remitente</span>
              <span>Billetera</span>
              <span className="text-right">Importe</span>
              <span className="text-right">Estado</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {recentList.map((transaction) => (
                <button
                  className="grid w-full gap-2 px-5 py-3.5 text-left transition hover:bg-neutral-50 sm:px-6 md:grid-cols-[minmax(220px,1fr)_130px_150px_120px] md:items-center md:gap-4"
                  key={transaction.id}
                  onClick={() => router.push('/transacciones')}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-neutral-950">
                      {transaction.sender_name ?? 'Remitente sin nombre'}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {formatElapsed(transaction.occurred_at)} · {transaction.device.label}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-[#c879d5]">
                    {transaction.wallet.display_name}
                  </span>
                  <span className="financial-value text-sm font-semibold text-neutral-950 md:text-right">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                  <span className="md:justify-self-end">
                    <StatusBadge status={transaction.status} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {isPairingDialogOpen && session && hasEnabledWallet && (
        <PairDeviceDialog
          accessToken={session.accessToken}
          onClose={() => setIsPairingDialogOpen(false)}
        />
      )}
    </div>
  );
}

function OnboardingPanel({
  hasAnyDevice,
  hasEnabledWallet,
  hasFirstTransaction,
}: Readonly<{
  hasAnyDevice: boolean;
  hasEnabledWallet: boolean;
  hasFirstTransaction: boolean;
}>) {
  return (
    <Card className="p-5 sm:p-6" data-animate id="primer-dispositivo">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
        Puesta en marcha
      </span>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
        Activa el monitoreo
      </h2>
      <p className="mt-2 text-sm leading-6 text-neutral-500">
        Completa estos pasos para comenzar a reconocer cobros de Yape.
      </p>

      <ol className="mt-6 space-y-4">
        <SetupStep complete label="Cuenta verificada" number="1" />
        <SetupStep complete={hasEnabledWallet} label="Yape activado" number="2" />
        <SetupStep complete={hasAnyDevice} label="Android vinculado" number="3" />
        <SetupStep complete={hasFirstTransaction} label="Primer cobro recibido" number="4" />
      </ol>

      <Link
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-brand-900"
        href={hasEnabledWallet ? '/dispositivos' : '/billeteras'}
      >
        Continuar configuración
        <DashboardIcon className="h-4 w-4" name="arrow-up-right" />
      </Link>
    </Card>
  );
}

function SystemStatusPanel({
  hasAnyDevice,
  onlineDevice,
}: Readonly<{ hasAnyDevice: boolean; onlineDevice: boolean }>) {
  return (
    <Card className="p-5 sm:p-6" data-animate>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Operación
          </p>
          <h2 className="mt-2 text-lg font-semibold text-neutral-950">Estado del sistema</h2>
        </div>
        <Badge className="gap-1.5" variant="success">
          <span className="h-2 w-2 rounded-full bg-success-500" />
          Operativo
        </Badge>
      </div>
      <div className="mt-6 space-y-2">
        <StatusRow label="Panel web" status="Conectado" />
        <StatusRow label="Sesión segura" status="Activa" />
        <StatusRow
          label="Android"
          pending={!onlineDevice}
          status={!hasAnyDevice ? 'Por vincular' : onlineDevice ? 'En línea' : 'Sin conexión'}
        />
      </div>
    </Card>
  );
}

function SetupStep({
  complete = false,
  label,
  number,
}: Readonly<{ complete?: boolean; label: string; number: string }>) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
          complete
            ? 'bg-success-500 text-neutral-950'
            : 'border border-neutral-200 bg-neutral-50 text-neutral-500'
        }`}
      >
        {complete ? <DashboardIcon className="h-3.5 w-3.5" name="check" /> : number}
      </span>
      <span className={`text-sm ${complete ? 'text-neutral-700' : 'text-neutral-500'}`}>
        {label}
      </span>
    </li>
  );
}

function StatusRow({
  label,
  pending = false,
  status,
}: Readonly<{ label: string; pending?: boolean; status: string }>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 py-3 last:border-b-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${pending ? 'text-warning-600' : 'text-success-600'}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${pending ? 'bg-warning-500' : 'bg-success-500'}`}
        />
        {status}
      </span>
    </div>
  );
}

function getGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('es-PE', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Lima',
    }).format(new Date()),
  );

  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
