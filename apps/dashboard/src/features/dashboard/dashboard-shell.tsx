'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon, type DashboardIconName } from '@/features/dashboard/dashboard-icon';
import { BrandMark } from '@/shared/components/BrandMark';

const navigation = [
  { icon: 'home', label: 'Inicio' },
  { icon: 'receipt', label: 'Transacciones' },
  { icon: 'device', label: 'Dispositivos' },
  { icon: 'wallet', label: 'Billeteras' },
  { icon: 'team', label: 'Equipo' },
  { icon: 'plug', label: 'Integraciones' },
] satisfies { icon: DashboardIconName; label: string }[];

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { logout, session } = useAuthSession();
  const tenant = session?.tenants[0];
  const initials = getInitials(session?.user.full_name);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col border-r border-white/5 bg-neutral-950 px-4 py-5 lg:sticky lg:top-0 lg:flex">
        <div className="px-2">
          <BrandMark inverse />
        </div>

        <nav aria-label="Navegación principal" className="mt-10">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Mi negocio
          </p>
          <div className="mt-3 space-y-1">
            {navigation.map((item, index) => {
              const content = (
                <>
                  <DashboardIcon className="h-5 w-5 shrink-0" name={item.icon} />
                  <span>{item.label}</span>
                  {index !== 0 && (
                    <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Pronto
                    </span>
                  )}
                </>
              );

              return index === 0 ? (
                <Link
                  aria-current="page"
                  className="flex items-center gap-3 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(36,119,239,0.22)] transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 focus:ring-offset-neutral-950"
                  href="/inicio"
                  key={item.label}
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400"
                  key={item.label}
                >
                  {content}
                </span>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-white">Configuración inicial</p>
              <span className="text-xs font-semibold text-brand-300">33%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 rounded-full bg-brand-400" />
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-400">
              Vincula un Android para comenzar a validar cobros.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-sm font-bold text-white">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">
                {tenant?.business_name ?? 'Mi negocio'}
              </span>
              <span className="block truncate text-xs text-neutral-500">
                {session?.user.email ?? 'Cuenta principal'}
              </span>
            </span>
            <button
              aria-label="Cerrar sesión"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              onClick={() => void handleLogout()}
              title="Cerrar sesión"
              type="button"
            >
              <DashboardIcon className="h-4.5 w-4.5" name="logout" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-[72px] items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <DashboardIcon className="h-4.5 w-4.5" name="home" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-neutral-900">Resumen general</span>
              <span className="block text-xs text-neutral-500">Inicio</span>
            </span>
          </div>

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <span className="mr-2 inline-flex items-center gap-2 rounded-full bg-success-50 px-3 py-1.5 text-xs font-semibold text-success-600">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              Panel conectado
            </span>
            <span
              aria-label="Sin notificaciones"
              className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-400"
              role="img"
              title="Sin notificaciones"
            >
              <DashboardIcon className="h-5 w-5" name="bell" />
            </span>
          </div>

          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-semibold text-neutral-900">
              {tenant?.business_name ?? 'Mi negocio'}
            </span>
            <span className="block text-xs text-neutral-500">Administrador</span>
          </span>
          <button
            aria-label="Cerrar sesión"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-950 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-brand-100 lg:hidden"
            onClick={() => void handleLogout()}
            title="Cerrar sesión"
            type="button"
          >
            {initials}
          </button>
        </header>

        <nav
          aria-label="Navegación móvil"
          className="flex gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-4 py-2 lg:hidden"
        >
          {navigation.slice(0, 4).map((item, index) =>
            index === 0 ? (
              <Link
                aria-current="page"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700"
                href="/inicio"
                key={item.label}
              >
                <DashboardIcon className="h-4 w-4" name={item.icon} />
                {item.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-500"
                key={item.label}
              >
                <DashboardIcon className="h-4 w-4" name={item.icon} />
                {item.label}
              </span>
            ),
          )}
        </nav>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function getInitials(fullName?: string): string {
  if (!fullName) return 'YL';

  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
