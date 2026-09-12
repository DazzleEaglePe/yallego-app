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
    <div className="dashboard-noir-theme relative min-h-screen overflow-x-clip bg-[#09090a] text-neutral-100 lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <div aria-hidden="true" className="dashboard-ambient" />
      <aside className="relative z-10 hidden h-screen flex-col border-r border-white/[0.07] bg-[#0a0a0b]/95 px-3 py-5 lg:sticky lg:top-0 lg:flex">
        <div className="px-1">
          <BrandMark inverse />
          <div className="mt-6 border-b border-white/[0.07] pb-5">
            <TenantSwitcher />
          </div>
        </div>

        <nav aria-label="Navegación principal" className="mt-5 flex-1 overflow-y-auto pr-1">
          {navigationSections.map((section) => {
            const items = navigation.filter((item) => item.section === section);
            if (items.length === 0) return null;

            return (
              <div
                className="border-t border-white/[0.055] py-4 first:border-t-0 first:pt-0"
                key={section}
              >
                <p className="px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
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
                            ? 'flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.075] px-3 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none ring-offset-[#0a0a0b] transition focus-visible:ring-2 focus-visible:ring-brand-500'
                            : 'flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-neutral-500 outline-none ring-offset-[#0a0a0b] transition hover:border-white/[0.05] hover:bg-white/[0.035] hover:text-neutral-200 focus-visible:ring-2 focus-visible:ring-brand-500'
                        }
                        href={item.href}
                        key={item.label}
                      >
                        <DashboardIcon
                          className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-brand-400' : ''}`}
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

        {canManageSubscription && (
          <Link
            className="group mb-3 block overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-3.5 transition hover:border-brand-400/35 hover:from-brand-500/10"
            href="/membresia"
          >
            <span className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
                <DashboardIcon className="h-4 w-4" name="ticket" />
              </span>
              <DashboardIcon
                className="h-3.5 w-3.5 text-neutral-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-300"
                name="arrow-up-right"
              />
            </span>
            <span className="mt-3 block text-xs font-semibold text-neutral-100">
              Plan y consumo
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-neutral-500">
              Revisa límites y facturación
            </span>
          </Link>
        )}

        <div className="mt-auto border-t border-white/[0.07] px-1 pt-4">
          <DashboardAccountMenu />
        </div>
      </aside>

      <div className="relative z-10 min-w-0 bg-[#0d0d0f]/90">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0d0d0f]/85 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <BrandMark compact inverse />
          </div>

          <div className="min-w-0 flex-1 sm:hidden">
            <TenantSwitcher compact />
          </div>

          <div className="hidden items-center gap-3 text-sm lg:flex">
            <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.045] text-neutral-400">
              <DashboardIcon className="h-4 w-4" name={page.icon} />
            </span>
            <span className="text-neutral-500">{page.section}</span>
            <span className="text-white/20">/</span>
            <span className="font-medium text-neutral-200">{page.title}</span>
          </div>

          <span className="ml-auto hidden min-w-0 items-center gap-3 sm:flex">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.09] bg-white/[0.055] text-[10px] font-bold text-neutral-200">
              {getInitials(tenant?.business_name)}
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Administrando
              </span>
              <span className="block max-w-48 truncate text-sm font-semibold text-neutral-100">
                {tenant?.business_name ?? 'Mi negocio'}
              </span>
            </span>
            <span className="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[10px] font-semibold text-neutral-400">
              {formatRoleLabel(tenant?.role)}
            </span>
          </span>
          <span className="lg:hidden">
            <DashboardAccountMenu compact />
          </span>
        </header>

        <nav
          aria-label="Navegación móvil"
          className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl border border-white/[0.1] bg-[#171719]/95 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl lg:hidden"
        >
          {primaryMobileNavigation.map((item) => {
            const isActive = item.href !== null && pathname?.startsWith(item.href);
            return item.href !== null ? (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'inline-flex min-w-16 flex-col items-center gap-1 rounded-xl bg-[#f4f4f5] px-3 py-2 text-[10px] font-semibold text-[#0b0b0c]'
                    : 'inline-flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-medium text-neutral-500'
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
              <div className="absolute bottom-[calc(100%+12px)] right-0 w-56 overflow-hidden rounded-xl border border-white/[0.1] bg-[#19191c] p-2 shadow-2xl">
                {secondaryMobileNavigation.map((item) => {
                  const isActive = item.href !== null && pathname?.startsWith(item.href);
                  return item.href ? (
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        isActive
                          ? 'flex items-center gap-3 rounded-lg bg-[#f4f4f5] px-3 py-2.5 text-sm font-semibold text-[#0b0b0c]'
                          : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-400 hover:bg-white/[0.05] hover:text-white'
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

        <main className="mx-auto max-w-[1540px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-9">
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
    return { icon: 'ticket', section: 'Administración', title: 'Plan y facturación' };
  }
  if (pathname?.startsWith('/auditoria')) {
    return { icon: 'shield', section: 'Administración', title: 'Auditoría' };
  }
  if (pathname?.startsWith('/cuenta')) {
    return { icon: 'user', section: 'Cuenta', title: 'Cuenta y seguridad' };
  }
  return { icon: 'home', section: 'Operación', title: 'Resumen general' };
}
