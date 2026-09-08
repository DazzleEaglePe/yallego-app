'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { can } from '@yallego/contracts';
import { useQuery } from '@tanstack/react-query';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon, type DashboardIconName } from '@/features/dashboard/dashboard-icon';
import { getVisibleNavigation } from '@/features/dashboard/dashboard-navigation';
import { TenantSwitcher } from '@/features/dashboard/TenantSwitcher';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { SubscriptionUsageNotice } from '@/features/subscription/components/SubscriptionUsageNotice';
import { fetchTransactions } from '@/features/transactions/api/transactions';
import { BrandMark } from '@/shared/components/BrandMark';

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, session } = useAuthSession();
  const tenant = getActiveTenant(session);
  const navigation = getVisibleNavigation(tenant?.role);
  const navigationSections = ['Operación', 'Configuración', 'Administración'] as const;
  const primaryMobileNavigation = navigation.slice(0, 3);
  const secondaryMobileNavigation = navigation.slice(3);
  const canManageDevices = tenant !== undefined && can(tenant.role, 'devices:manage');
  const canManageSubscription = tenant !== undefined && can(tenant.role, 'subscription:manage');
  const initials = getInitials(session?.user.full_name);
  const page = getPageMeta(pathname);
  const devices = useDevices();
  const accessToken = session?.accessToken ?? null;
  const setupTransactions = useQuery({
    queryKey: ['transactions', 'setup-progress'],
    queryFn: () => fetchTransactions(accessToken!, { limit: 1 }),
    enabled: canManageDevices && Boolean(accessToken),
  });
  const hasDevice = (devices.data?.length ?? 0) > 0;
  const hasTransaction = (setupTransactions.data?.data.length ?? 0) > 0;
  const setupSteps = 1 + Number(hasDevice) + Number(hasTransaction);
  const setupProgress = Math.round((setupSteps / 3) * 100);
  const setupMessage = !hasDevice
    ? 'Vincula un Android para comenzar a validar cobros.'
    : !hasTransaction
      ? 'Dispositivo vinculado. Falta recibir el primer cobro.'
      : 'Configuración completada. Tu negocio ya recibe cobros.';

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="dashboard-theme min-h-screen bg-neutral-950 text-neutral-100 lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col border-r border-white/5 bg-neutral-950 px-4 py-6 lg:sticky lg:top-0 lg:flex">
        <div className="px-1">
          <BrandMark inverse />
          <div className="mt-8">
            <TenantSwitcher variant="dark" />
          </div>
        </div>

        <nav aria-label="Navegación principal" className="mt-9 space-y-6">
          {navigationSections.map((section) => {
            const items = navigation.filter((item) => item.section === section);
            if (items.length === 0) return null;

            return (
              <div key={section}>
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  {section}
                </p>
                <div className="mt-2 space-y-1">
                  {items.map((item) => {
                    const isActive = item.href !== null && pathname?.startsWith(item.href);
                    if (item.href === null) return null;

                    return (
                      <Link
                        aria-current={isActive ? 'page' : undefined}
                        className={
                          isActive
                            ? 'relative flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm font-semibold text-white transition before:absolute before:-left-[17px] before:h-5 before:w-0.5 before:rounded-full before:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40'
                            : 'flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-neutral-400 transition hover:border-white/5 hover:bg-white/[0.04] hover:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-400/40'
                        }
                        href={item.href}
                        key={item.label}
                      >
                        <DashboardIcon
                          className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-300' : ''}`}
                          name={item.icon}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto">
          {canManageDevices && setupProgress < 100 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-white">Configuración inicial</p>
                <span className="text-xs font-semibold text-brand-300">{setupProgress}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-400 transition-[width] duration-200"
                  style={{ width: `${setupProgress}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-neutral-400">{setupMessage}</p>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3 border-t border-white/10 px-1 pt-5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-xs font-semibold text-white">
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

      <div className="min-w-0 bg-neutral-950">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <BrandMark compact inverse />
          </div>

          <div className="min-w-0 flex-1 sm:hidden">
            <TenantSwitcher />
          </div>

          <div className="hidden items-center gap-3 text-sm lg:flex">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-brand-300">
              <DashboardIcon className="h-4 w-4" name={page.icon} />
            </span>
            <span className="text-neutral-500">{page.section}</span>
            <span className="text-neutral-700">/</span>
            <span className="font-medium text-neutral-100">{page.title}</span>
          </div>

          <div className="ml-auto hidden items-center gap-2 sm:flex">
            <span
              aria-label="Sin notificaciones"
              className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-400"
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
            <span className="block text-xs text-neutral-500">{roleLabel(tenant?.role)}</span>
          </span>
          <button
            aria-label="Cerrar sesión"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-400/40 lg:hidden"
            onClick={() => void handleLogout()}
            title="Cerrar sesión"
            type="button"
          >
            {initials}
          </button>
        </header>

        <nav
          aria-label="Navegación móvil"
          className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-xl border border-neutral-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl lg:hidden"
        >
          {primaryMobileNavigation.map((item) => {
            const isActive = item.href !== null && pathname?.startsWith(item.href);
            return item.href !== null ? (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'inline-flex min-w-16 flex-col items-center gap-1 rounded-lg bg-brand-50 px-3 py-2 text-[10px] font-semibold text-brand-300'
                    : 'inline-flex min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-medium text-neutral-500'
                }
                href={item.href}
                key={item.label}
              >
                <DashboardIcon className="h-[18px] w-[18px]" name={item.icon} />
                {item.label}
              </Link>
            ) : null;
          })}
          {secondaryMobileNavigation.length > 0 && (
            <details className="group relative">
              <summary className="flex min-w-16 cursor-pointer list-none flex-col items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-medium text-neutral-500">
                <DashboardIcon className="h-[18px] w-[18px]" name="menu" />
                Más
              </summary>
              <div className="absolute bottom-[calc(100%+12px)] right-0 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
                {secondaryMobileNavigation.map((item) => {
                  const isActive = item.href !== null && pathname?.startsWith(item.href);
                  return item.href ? (
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-300'
                          : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-50'
                      }
                      href={item.href}
                      key={item.label}
                    >
                      <DashboardIcon className="h-4 w-4" name={item.icon} />
                      {item.label}
                    </Link>
                  ) : null;
                })}
              </div>
            </details>
          )}
        </nav>

        <main className="mx-auto max-w-[1560px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <SubscriptionUsageNotice enabled={canManageSubscription} tenantId={tenant?.id} />
          {children}
        </main>
      </div>
    </div>
  );
}

function getPageMeta(pathname: string | null): {
  icon: DashboardIconName;
  section: string;
  title: string;
} {
  if (pathname?.startsWith('/transacciones')) {
    return { icon: 'receipt', section: 'Operación', title: 'Transacciones' };
  }
  if (pathname?.startsWith('/dispositivos')) {
    return { icon: 'device', section: 'Configuración', title: 'Dispositivos' };
  }
  if (pathname?.startsWith('/billeteras')) {
    return { icon: 'wallet', section: 'Configuración', title: 'Billeteras' };
  }
  if (pathname?.startsWith('/equipo')) {
    return { icon: 'team', section: 'Administración', title: 'Equipo' };
  }
  if (pathname?.startsWith('/integraciones')) {
    return { icon: 'plug', section: 'Administración', title: 'Integraciones' };
  }
  if (pathname?.startsWith('/membresia')) {
    return { icon: 'ticket', section: 'Administración', title: 'Membresía' };
  }
  if (pathname?.startsWith('/auditoria')) {
    return { icon: 'shield', section: 'Administración', title: 'Auditoría' };
  }
  return { icon: 'home', section: 'Operación', title: 'Resumen general' };
}

function roleLabel(role: string | undefined): string {
  if (role === 'OWNER') return 'Propietario';
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'OPERATOR') return 'Operador';
  if (role === 'VIEWER') return 'Solo lectura';
  return 'Cuenta principal';
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
