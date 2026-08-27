'use client';

import { useAuthSession } from '@/features/auth/auth-session';

export default function DashboardHomePage() {
  const { session } = useAuthSession();
  const firstName = session?.user.full_name.trim().split(/\s+/)[0] ?? 'hola';
  const today = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Lima',
    weekday: 'long',
  }).format(new Date());

  return (
    <div>
      <p className="text-sm font-medium text-brand-600 first-letter:uppercase">{today}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900">
        Buenos días, {firstName}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Aquí aparecerá el resumen en tiempo real de tu negocio.
      </p>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resumen">
        {[
          ['Cobrado hoy', 'S/ 0.00'],
          ['Transacciones', '0'],
          ['Dispositivos activos', '0 de 1'],
        ].map(([label, value]) => (
          <article
            className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
            key={label}
          >
            <p className="text-sm font-medium text-neutral-500">{label}</p>
            <p className="mt-3 font-mono text-2xl font-bold text-neutral-900">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-xl text-brand-600"
          aria-hidden="true"
        >
          ↗
        </div>
        <h2 className="mt-4 text-lg font-semibold text-neutral-900">
          Vincula tu primer dispositivo
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
          Conecta un Android para empezar a recibir y validar notificaciones de pago.
        </p>
        <button
          className="mt-5 rounded-md bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          type="button"
        >
          Configurar dispositivo
        </button>
      </section>
    </div>
  );
}
