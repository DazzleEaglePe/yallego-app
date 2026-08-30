'use client';

import { useState } from 'react';

import { useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon, type DashboardIconName } from '@/features/dashboard/dashboard-icon';
import { PairDeviceDialog } from '@/features/devices/components/PairDeviceDialog';

const metrics = [
  {
    detail: 'Sin movimientos todavía',
    icon: 'wallet',
    label: 'Cobrado hoy',
    value: 'S/ 0.00',
  },
  {
    detail: '0 aprobadas · 0 observadas',
    icon: 'receipt',
    label: 'Transacciones',
    value: '0',
  },
  {
    detail: 'Se calculará con tu primer cobro',
    icon: 'ticket',
    label: 'Ticket promedio',
    value: 'S/ 0.00',
  },
  {
    detail: 'Vincula tu primer Android',
    icon: 'device',
    label: 'Dispositivos activos',
    value: '0 de 1',
  },
] satisfies {
  detail: string;
  icon: DashboardIconName;
  label: string;
  value: string;
}[];

const weekDays = ['Jue', 'Vie', 'Sáb', 'Dom', 'Lun', 'Mar', 'Hoy'];

export default function DashboardHomePage() {
  const { session } = useAuthSession();
  const [isPairingDialogOpen, setIsPairingDialogOpen] = useState(false);
  const firstName = session?.user.full_name.trim().split(/\s+/)[0] ?? 'equipo';
  const today = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Lima',
    weekday: 'long',
  }).format(new Date());
  const greeting = getGreeting();

  return (
    <div className="pb-6">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
            <DashboardIcon className="h-4 w-4 text-brand-500" name="calendar" />
            <span className="first-letter:uppercase">{today}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Todo lo importante de tu negocio, listo para revisar en un solo lugar.
          </p>
        </div>

        <button
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
          onClick={() => setIsPairingDialogOpen(true)}
          type="button"
        >
          <DashboardIcon className="h-4 w-4" name="device" />
          Vincular dispositivo
          <DashboardIcon className="h-4 w-4" name="arrow-up-right" />
        </button>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen">
        {metrics.map((metric) => (
          <article
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.03)] transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-900/5"
            key={metric.label}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-neutral-500">{metric.label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                <DashboardIcon className="h-4.5 w-4.5" name={metric.icon} />
              </span>
            </div>
            <p className="mt-4 font-mono text-2xl font-bold tracking-tight text-neutral-950">
              {metric.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-neutral-500">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.7fr)]">
        <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.03)]">
          <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Actividad de cobros</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Importe recibido durante los últimos 7 días
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
              <DashboardIcon className="h-4 w-4" name="calendar" />
              Últimos 7 días
            </span>
          </div>

          <div className="p-5 sm:p-6">
            <div className="relative h-64 overflow-hidden rounded-2xl bg-neutral-50">
              <div
                aria-hidden="true"
                className="absolute inset-x-5 inset-y-7 flex flex-col justify-between"
              >
                {[0, 1, 2, 3].map((line) => (
                  <span className="block border-t border-dashed border-neutral-200" key={line} />
                ))}
              </div>
              <div className="absolute inset-0 grid place-items-center px-5 pb-8 text-center">
                <div className="rounded-2xl border border-neutral-200 bg-white/95 px-5 py-4 shadow-lg shadow-neutral-900/5 backdrop-blur">
                  <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <DashboardIcon className="h-5 w-5" name="activity" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-neutral-900">
                    Aún no hay movimientos
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Tu primer cobro aparecerá aquí en tiempo real.
                  </p>
                </div>
              </div>
              <div
                aria-hidden="true"
                className="absolute inset-x-5 bottom-4 grid grid-cols-7 gap-2"
              >
                {weekDays.map((day) => (
                  <span className="text-center text-[11px] font-medium text-neutral-400" key={day}>
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article
          className="relative overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white shadow-xl shadow-neutral-950/10"
          id="primer-dispositivo"
        >
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex rounded-full border border-brand-400/30 bg-brand-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-200">
              Primeros pasos
            </span>
            <h2 className="mt-5 max-w-xs text-2xl font-bold tracking-tight">
              Activa el monitoreo de tu negocio
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              Conecta un Android y Yallegó empezará a reconocer tus notificaciones de pago.
            </p>

            <ol className="mt-6 space-y-4">
              <SetupStep complete label="Cuenta creada y verificada" number="1" />
              <SetupStep label="Vincular dispositivo Android" number="2" />
              <SetupStep label="Recibir el primer cobro" number="3" />
            </ol>

            <details className="group mt-6 rounded-xl border border-white/10 bg-white/[0.06] p-4 open:bg-white/[0.08]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold focus:outline-none">
                Ver guía de conexión
                <DashboardIcon
                  className="h-4 w-4 transition group-open:rotate-90"
                  name="chevron-right"
                />
              </summary>
              <ol className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs leading-5 text-neutral-300">
                <li>1. Instala Yallegó en el Android que recibe los pagos.</li>
                <li>2. Autoriza el acceso a notificaciones.</li>
                <li>3. Escanea el código de vinculación desde este panel.</li>
              </ol>
            </details>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.7fr)]">
        <article className="rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.03)]">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Últimas transacciones</h2>
              <p className="mt-1 text-sm text-neutral-500">Cobros detectados más recientemente</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
              0 registros
            </span>
          </div>
          <div className="grid min-h-52 place-items-center px-5 py-8 text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-400">
                <DashboardIcon className="h-5 w-5" name="receipt" />
              </span>
              <p className="mt-4 text-sm font-semibold text-neutral-900">Tu historial está listo</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-neutral-500">
                En cuanto llegue una notificación de pago válida, la verás aquí con su billetera,
                importe y estado.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.03)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Estado del sistema</h2>
              <p className="mt-1 text-sm text-neutral-500">Resumen operativo</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-success-50 text-success-600">
              <DashboardIcon className="h-5 w-5" name="shield" />
            </span>
          </div>
          <div className="mt-6 space-y-3">
            <StatusRow label="Panel web" status="Conectado" />
            <StatusRow label="Sesión segura" status="Activa" />
            <StatusRow label="Dispositivo Android" pending status="Por vincular" />
          </div>
        </article>
      </section>

      {isPairingDialogOpen && session && (
        <PairDeviceDialog accessToken={session.accessToken} onClose={() => setIsPairingDialogOpen(false)} />
      )}
    </div>
  );
}

function SetupStep({
  complete = false,
  label,
  number,
}: {
  complete?: boolean;
  label: string;
  number: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
          complete
            ? 'bg-brand-500 text-white'
            : 'border border-white/15 bg-white/[0.06] text-neutral-400'
        }`}
      >
        {complete ? <DashboardIcon className="h-4 w-4" name="check" /> : number}
      </span>
      <span className={`text-sm ${complete ? 'text-white' : 'text-neutral-400'}`}>{label}</span>
    </li>
  );
}

function StatusRow({
  label,
  pending = false,
  status,
}: {
  label: string;
  pending?: boolean;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 px-3.5 py-3">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
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
