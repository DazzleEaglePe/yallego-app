'use client';

import { ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { formatRoleLabel, getInitials } from '@/features/dashboard/dashboard-labels';
import { getVisibleNavigation } from '@/features/dashboard/dashboard-navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/cn';

interface DashboardAccountMenuProps {
  compact?: boolean;
}

const accountLinkLabels = new Set(['Equipo', 'Integraciones', 'Membresía', 'Auditoría']);

export function DashboardAccountMenu({ compact = false }: DashboardAccountMenuProps) {
  const router = useRouter();
  const { logout, session } = useAuthSession();
  const tenant = getActiveTenant(session);
  const accountLinks = getVisibleNavigation(tenant?.role).filter(
    (item) => item.href !== null && accountLinkLabels.has(item.label),
  );

  if (!session || !tenant) return null;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  const initials = getInitials(session.user.full_name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={compact ? 'Abrir menú de cuenta' : undefined}
          className={cn(
            'group flex items-center text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            compact
              ? 'h-9 w-9 justify-center rounded-lg border border-neutral-200 bg-white'
              : 'w-full gap-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-2 hover:border-neutral-300 hover:bg-neutral-100',
          )}
          type="button"
        >
          <span
            className={cn(
              'grid shrink-0 place-items-center rounded-lg bg-neutral-900 font-semibold text-white',
              compact ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
            )}
          >
            {initials}
          </span>
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-neutral-900">
                  {session.user.full_name}
                </span>
                <span className="block truncate text-xs text-neutral-500">
                  {session.user.email}
                </span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-neutral-400 transition group-data-[state=open]:text-neutral-700" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={compact ? 'end' : 'start'}
        className="w-[min(320px,calc(100vw-24px))]"
        side={compact ? 'bottom' : 'right'}
      >
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-900 text-sm font-semibold text-white">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-neutral-950">
              {session.user.full_name}
            </span>
            <span className="block truncate text-xs text-neutral-500">{session.user.email}</span>
          </span>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/cuenta">
              <DashboardIcon className="h-4 w-4 text-neutral-400" name="user" />
              <span className="flex-1">Cuenta y seguridad</span>
              <DashboardIcon className="h-3.5 w-3.5 text-neutral-300" name="chevron-right" />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Empresa administrada</DropdownMenuLabel>
        <div className="mx-1 mb-1 flex items-center gap-3 rounded-lg bg-neutral-50 px-2.5 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-xs font-bold text-neutral-700">
            {getInitials(tenant.business_name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900">
              {tenant.business_name}
            </span>
            <span className="block text-xs text-neutral-500">{formatRoleLabel(tenant.role)}</span>
          </span>
        </div>

        {accountLinks.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Cuenta y administración</DropdownMenuLabel>
            <DropdownMenuGroup>
              {accountLinks.map((item) =>
                item.href ? (
                  <DropdownMenuItem asChild key={item.label}>
                    <Link href={item.href}>
                      <DashboardIcon className="h-4 w-4 text-neutral-400" name={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      <DashboardIcon
                        className="h-3.5 w-3.5 text-neutral-300"
                        name="chevron-right"
                      />
                    </Link>
                  </DropdownMenuItem>
                ) : null,
              )}
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger-700 focus:bg-danger-50 focus:text-danger-800"
          onSelect={() => void handleLogout()}
        >
          <DashboardIcon className="h-4 w-4" name="logout" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
