'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

import { ApiRequestError } from '@/features/auth/api';
import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { formatRoleLabel, getInitials } from '@/features/dashboard/dashboard-labels';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/cn';

interface TenantSwitcherProps {
  compact?: boolean;
}

export function TenantSwitcher({ compact = false }: TenantSwitcherProps) {
  const queryClient = useQueryClient();
  const { session, switchTenant } = useAuthSession();
  const activeTenant = getActiveTenant(session);
  const [isSwitching, setSwitching] = useState(false);
  const [error, setError] = useState<string>();

  if (!session || !activeTenant) return null;

  async function handleChange(tenantId: string) {
    if (tenantId === activeTenant?.id) return;

    setError(undefined);
    setSwitching(true);
    try {
      await queryClient.cancelQueries();
      await switchTenant(tenantId);
      queryClient.clear();
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'No pudimos cambiar de empresa. Inténtalo nuevamente.',
      );
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isSwitching}>
          <button
            aria-busy={isSwitching}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-left outline-none transition hover:border-neutral-300 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70',
              compact ? 'h-10 px-2' : 'p-2.5',
            )}
            type="button"
          >
            <span
              className={cn(
                'grid shrink-0 place-items-center rounded-lg bg-white font-bold text-neutral-700 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]',
                compact ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
              )}
            >
              {getInitials(activeTenant.business_name)}
            </span>
            <span className="min-w-0 flex-1">
              {!compact && (
                <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                  Empresa activa
                </span>
              )}
              <span className="block truncate text-sm font-semibold text-neutral-900">
                {activeTenant.business_name}
              </span>
            </span>
            {isSwitching ? (
              <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-neutral-400 transition group-data-[state=open]:text-neutral-700" />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-72 max-w-[calc(100vw-24px)]"
          side={compact ? 'bottom' : 'right'}
        >
          <DropdownMenuLabel>Cambiar de empresa</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {session.tenants.map((tenant) => {
            const isActive = tenant.id === activeTenant.id;

            return (
              <DropdownMenuItem
                className="py-2.5"
                disabled={isSwitching}
                key={tenant.id}
                onSelect={() => void handleChange(tenant.id)}
              >
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-xs font-bold',
                    isActive
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600',
                  )}
                >
                  {getInitials(tenant.business_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-neutral-900">
                    {tenant.business_name}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {formatRoleLabel(tenant.role)}
                  </span>
                </span>
                {isActive && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="mt-1.5 text-xs text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
