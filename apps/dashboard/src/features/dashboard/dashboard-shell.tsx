'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { can } from '@yallego/contracts';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardAccountMenu } from '@/features/dashboard/dashboard-account-menu';
import { DashboardIcon, type DashboardIconName } from '@/features/dashboard/dashboard-icon';
import { formatRoleLabel, getInitials } from '@/features/dashboard/dashboard-labels';
import { DashboardMotion } from '@/features/dashboard/dashboard-motion';
import { getVisibleNavigation } from '@/features/dashboard/dashboard-navigation';
import { TenantSwitcher } from '@/features/dashboard/TenantSwitcher';
import { SubscriptionUsageNotice } from '@/features/subscription/components/SubscriptionUsageNotice';
import { BrandMark } from '@/shared/components/BrandMark';

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const { session } = useAuthSession();
  const tenant = getActiveTenant(session);
  const navigation = getVisibleNavigation(tenant?.role);
  const navigationSections = ['Operación', 'Configuración', 'Administración'] as const;
  const primaryMobileNavigation = navigation.slice(0, 3);
  const secondaryMobileNavigation = navigation.slice(3);
  const canManageSubscription = tenant !== undefined && can(tenant.role, 'subscription:manage');
  const page = getPageMeta(pathname);

  return (
    <div className="dashboard-minimal-theme min-h-screen bg-[#f7f7f8] text-neutral-950 lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden h-screen flex-col border-r border-neutral-200/80 bg-white px-3.5 py-5 lg:sticky lg:top-0 lg:flex">
        <div className="px-1">
          <BrandMark />
          <div className="mt-6 border-b border-neutral-200 pb-5">
            <TenantSwitcher />
          </div>
        </div>

        <nav aria-label="Navegación principal" className="mt-5 flex-1 overflow-y-auto pr-1">
          {navigationSections.map((section) => {
            const items = navigation.filter((item) => item.section === section);
            if (items.length === 0) return null;

            return (
              <div
                className="border-t border-neutral-100 py-4 first:border-t-0 first:pt-0"
                key={section}
              >
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
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
                            ? 'flex items-center gap-3 rounded-lg bg-neutral-100 px-3 py-2.5 text-sm font-semibold text-neutral-950 outline-none ring-offset-white transition focus-visible:ring-2 focus-visible:ring-brand-500'
                            : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-500 outline-none ring-offset-white transition hover:bg-neutral-50 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-brand-500'
                        }
                        href={item.href}
                        key={item.label}
                      >
                        <DashboardIcon
                          className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-600' : ''}`}
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

        <div className="mt-auto border-t border-neutral-200 px-1 pt-4">
          <DashboardAccountMenu />
        </div>
      </aside>

      <div className="min-w-0 bg-[#f7f7f8]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-neutral-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>

          <div className="min-w-0 flex-1 sm:hidden">
            <TenantSwitcher compact />
          </div>

          <div className="hidden items-center gap-3 text-sm lg:flex">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-600">
              <DashboardIcon className="h-4 w-4" name={page.icon} />
            </span>
            <span className="text-neutral-500">{page.section}</span>
            <span className="text-neutral-300">/</span>
            <span className="font-medium text-neutral-700">{page.title}</span>
          </div>

          <span className="ml-auto hidden min-w-0 items-center gap-3 sm:flex">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-[10px] font-bold text-neutral-700">
              {getInitials(tenant?.business_name)}
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Administrando
              </span>
              <span className="block max-w-48 truncate text-sm font-semibold text-neutral-900">
                {tenant?.business_name ?? 'Mi negocio'}
              </span>
            </span>
            <span className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[10px] font-semibold text-neutral-500">
              {formatRoleLabel(tenant?.role)}
            </span>
          </span>
          <span className="lg:hidden">
            <DashboardAccountMenu compact />
          </span>
        </header>

        <nav
          aria-label="Navegación móvil"
          className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-xl border border-neutral-200 bg-white/95 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.10)] backdrop-blur-xl lg:hidden"
        >
          {primaryMobileNavigation.map((item) => {
            const isActive = item.href !== null && pathname?.startsWith(item.href);
            return item.href !== null ? (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'inline-flex min-w-16 flex-col items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-[10px] font-semibold text-white'
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
                          ? 'flex items-center gap-3 rounded-lg bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white'
                          : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50'
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

        <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <SubscriptionUsageNotice enabled={canManageSubscription} tenantId={tenant?.id} />
          <DashboardMotion routeKey={pathname}>{children}</DashboardMotion>
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
