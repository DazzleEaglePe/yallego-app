'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { ApiRequestError } from '@/features/auth/api';
import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';

interface TenantSwitcherProps {
  variant?: 'dark' | 'light';
}

export function TenantSwitcher({ variant = 'light' }: Readonly<TenantSwitcherProps>) {
  const id = useId();
  const queryClient = useQueryClient();
  const { session, switchTenant } = useAuthSession();
  const activeTenant = getActiveTenant(session);
  const [isSwitching, setSwitching] = useState(false);
  const [error, setError] = useState<string>();

  if (!session || !activeTenant) return null;

  async function handleChange(tenantId: string) {
    if (tenantId === session?.activeTenantId) return;

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
          : 'No pudimos cambiar de negocio. Inténtalo nuevamente.',
      );
    } finally {
      setSwitching(false);
    }
  }

  const isDark = variant === 'dark';

  return (
    <div className="min-w-0">
      <label
        className={
          isDark
            ? 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500'
            : 'sr-only'
        }
        htmlFor={id}
      >
        Negocio activo
      </label>
      <div className="relative">
        <select
          aria-busy={isSwitching}
          className={
            isDark
              ? 'h-11 w-full appearance-none truncate rounded-xl border border-white/10 bg-white/[0.05] py-2 pl-3 pr-9 text-sm font-semibold text-white outline-none transition hover:bg-white/[0.08] focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 disabled:cursor-wait disabled:opacity-70'
              : 'h-10 max-w-[190px] appearance-none truncate rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-3 pr-8 text-sm font-semibold text-neutral-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:cursor-wait disabled:opacity-70'
          }
          disabled={isSwitching}
          id={id}
          onChange={(event) => void handleChange(event.target.value)}
          value={activeTenant.id}
        >
          {session.tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.business_name}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}
        >
          {isSwitching ? '…' : '⌄'}
        </span>
      </div>
      {error && (
        <p className={`mt-1.5 text-xs ${isDark ? 'text-red-300' : 'text-danger-600'}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
