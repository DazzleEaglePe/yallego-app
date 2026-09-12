'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { can } from '@yallego/contracts';
import { ArrowUpRight, Command, Search, X } from 'lucide-react';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardAccountMenu } from '@/features/dashboard/dashboard-account-menu';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { DashboardMotion } from '@/features/dashboard/dashboard-motion';
import { getVisibleNavigation } from '@/features/dashboard/dashboard-navigation';
import { TenantSwitcher } from '@/features/dashboard/TenantSwitcher';
import { SubscriptionUsageNotice } from '@/features/subscription/components/SubscriptionUsageNotice';

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const { session } = useAuthSession();
  const tenant = getActiveTenant(session);
  const navigation = getVisibleNavigation(tenant?.role);
  const page = navigation.find((item) => item.href && pathname?.startsWith(item.href));
  const canManageSubscription = tenant !== undefined && can(tenant.role, 'subscription:manage');
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const results = navigation.filter((item) =>
    item.label.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuery('');
        if (dialog.current?.open) dialog.current.close();
        else dialog.current?.showModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  return (
    <div className="dashboard-workspace">
      <aside className="workspace-sidebar">
        <Link href="/inicio" className="workspace-brand" aria-label="Yallegó, inicio">
          <span className="workspace-logomark">
            y<span>•</span>
          </span>
          <span>
            yallegó<span className="workspace-brand-period">.</span>
          </span>
          <span className="workspace-edition">WORKSPACE</span>
        </Link>
        <TenantSwitcher compact />
        <button
          className="workspace-search"
          type="button"
          onClick={() => {
            setQuery('');
            dialog.current?.showModal();
          }}
        >
          <Search size={15} />
          <span>Ir a una sección</span>
          <kbd>⌘ K</kbd>
        </button>
        <nav aria-label="Navegación principal" className="workspace-navigation">
          {(['Operación', 'Configuración', 'Administración'] as const).map((section) => {
            const items = navigation.filter((item) => item.section === section && item.href);
            return items.length ? (
              <div className="workspace-nav-group" key={section}>
                <p>{section === 'Operación' ? 'TU ESPACIO' : section.toLocaleUpperCase('es')}</p>
                {items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className="workspace-nav-link"
                    aria-current={pathname?.startsWith(item.href!) ? 'page' : undefined}
                  >
                    <DashboardIcon name={item.icon} className="h-4 w-4" />
                    <span>{item.label === 'Inicio' ? 'Vista general' : item.label}</span>
                    {pathname?.startsWith(item.href!) && (
                      <span className="workspace-selected-dot" />
                    )}
                  </Link>
                ))}
              </div>
            ) : null;
          })}
        </nav>
        {canManageSubscription && (
          <Link className="workspace-plan" href="/membresia">
            <span className="workspace-plan-symbol">↗</span>
            <span>
              <strong>Espacio para crecer</strong>
              <small>Tu plan y límites de uso</small>
            </span>
            <ArrowUpRight size={14} />
          </Link>
        )}
        <DashboardAccountMenu />
        <p className="workspace-sidebar-foot">Hecho para tu día a día.</p>
      </aside>
      <div className="workspace-canvas">
        <header className="workspace-topbar">
          <div className="workspace-mobile-tenant">
            <TenantSwitcher compact />
          </div>
          <div className="workspace-breadcrumb">
            <span className="workspace-breadcrumb-mark">⊞</span>
            <span>{tenant?.business_name ?? 'Mi negocio'}</span>
            <span>/</span>
            <strong>
              {page?.label === 'Inicio' ? 'Vista general' : (page?.label ?? 'Cuenta y seguridad')}
            </strong>
          </div>
          <div className="workspace-topbar-actions">
            <span className="workspace-private">
              <DashboardIcon name="shield" className="h-3.5 w-3.5" /> Espacio privado
            </span>
            <button
              type="button"
              className="workspace-icon-button"
              aria-label="Buscar sección"
              onClick={() => {
                setQuery('');
                dialog.current?.showModal();
              }}
            >
              <Search size={16} />
            </button>
            <DashboardAccountMenu compact />
          </div>
        </header>
        <main className="workspace-main">
          <SubscriptionUsageNotice enabled={canManageSubscription} tenantId={tenant?.id} />
          <DashboardMotion routeKey={pathname}>{children}</DashboardMotion>
        </main>
        <nav className="workspace-mobile-nav" aria-label="Navegación móvil">
          {navigation.slice(0, 3).map(
            (item) =>
              item.href && (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={pathname?.startsWith(item.href) ? 'page' : undefined}
                >
                  <DashboardIcon name={item.icon} className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              ),
          )}
          <button
            type="button"
            onClick={() => {
              setQuery('');
              dialog.current?.showModal();
            }}
          >
            <Command size={18} />
            Más
          </button>
        </nav>
      </div>
      <dialog
        ref={dialog}
        className="workspace-command"
        aria-labelledby="command-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="workspace-command-input">
          <Search size={19} />
          <label className="sr-only" htmlFor="command-query" id="command-title">
            Buscar una sección
          </label>
          <input
            id="command-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="¿A dónde quieres ir?"
            autoComplete="off"
          />
          <button
            type="button"
            aria-label="Cerrar búsqueda"
            onClick={() => dialog.current?.close()}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-command-results">
          <p>SECCIONES DE TU ESPACIO</p>
          {results.map(
            (item) =>
              item.href && (
                <Link key={item.label} href={item.href} onClick={() => dialog.current?.close()}>
                  <DashboardIcon name={item.icon} className="h-4 w-4" />
                  <span>{item.label}</span>
                  <ArrowUpRight size={14} />
                </Link>
              ),
          )}
          {!results.length && (
            <span className="block p-4 text-sm text-neutral-500">No encontramos esa sección.</span>
          )}
        </div>
        <footer>Usa Tab para navegar · Esc para cerrar</footer>
      </dialog>
    </div>
  );
}
