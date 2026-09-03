'use client';

import { can, type TenantWalletSummary, type WalletCatalogEntry } from '@yallego/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiRequestError } from '@/features/auth/api';
import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { useWalletActions, useWallets } from '@/features/wallets/hooks/use-wallets';

export default function WalletsPage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role;
  const hasAccess = role !== undefined && can(role, 'wallets:manage');
  const { catalog, tenantWallets } = useWallets(hasAccess);
  const actions = useWalletActions();
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [reference, setReference] = useState('');

  const catalogEntries = catalog.data ?? [];
  const configured = tenantWallets.data ?? [];
  const configuredByCode = new Map(configured.map((entry) => [entry.wallet.code, entry]));
  const enabledCount = configured.filter((entry) => entry.is_enabled).length;
  const isLoading = catalog.isLoading || tenantWallets.isLoading;
  const loadFailed = catalog.isError || tenantWallets.isError;
  const actionError =
    errorMessage(actions.activate.error) ??
    errorMessage(actions.update.error) ??
    errorMessage(actions.deactivate.error);
  const isBusy =
    actions.activate.isPending || actions.update.isPending || actions.deactivate.isPending;

  useEffect(() => {
    if (role !== undefined && !hasAccess) router.replace('/inicio');
  }, [hasAccess, role, router]);

  if (!hasAccess) return null;

  function beginEdit(code: string) {
    setEditingCode(code);
    setReference('');
    actions.activate.reset();
    actions.update.reset();
    actions.deactivate.reset();
  }

  function save(entry: WalletCatalogEntry, current: TenantWalletSummary | undefined) {
    const accountReference = reference.trim();
    if (current) {
      actions.update.mutate(
        {
          walletId: current.id,
          input: {
            is_enabled: true,
            ...(accountReference ? { account_reference: accountReference } : {}),
          },
        },
        { onSuccess: () => setEditingCode(null) },
      );
      return;
    }
    actions.activate.mutate(
      {
        wallet_code: entry.code,
        ...(accountReference ? { account_reference: accountReference } : {}),
      },
      { onSuccess: () => setEditingCode(null) },
    );
  }

  return (
    <div className="pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-500" name="wallet" />
            <h1 className="text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
              Billeteras
            </h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Elige qué aplicaciones de pago monitorea tu negocio. Los cambios se aplican a tus
            dispositivos vinculados.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">
          {enabledCount} activa{enabledCount === 1 ? '' : 's'}
        </span>
      </section>

      {actionError && (
        <p
          className="mt-5 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <section className="mt-7 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-neutral-950">Métodos disponibles</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Solo aparecen billeteras operativas en el catálogo de Yallegó.
          </p>
        </div>

        {isLoading && <WalletsSkeleton />}
        {loadFailed && (
          <LoadError
            onRetry={() => void Promise.all([catalog.refetch(), tenantWallets.refetch()])}
          />
        )}
        {!isLoading && !loadFailed && catalogEntries.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-neutral-800">No hay billeteras disponibles</p>
            <p className="mt-1 text-sm text-neutral-500">
              El catálogo todavía no tiene parsers operativos para activar.
            </p>
          </div>
        )}
        {!isLoading && !loadFailed && catalogEntries.length > 0 && (
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
            {catalogEntries.map((entry) => {
              const current = configuredByCode.get(entry.code);
              const isEnabled = current?.is_enabled === true;
              const isEditing = editingCode === entry.code;
              return (
                <article className="rounded-2xl border border-neutral-200 p-5" key={entry.id}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-600">
                      <DashboardIcon className="h-5 w-5" name="wallet" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-base font-semibold text-neutral-950">
                          {entry.display_name}
                        </h3>
                        <span
                          className={
                            isEnabled
                              ? 'rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600'
                              : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500'
                          }
                        >
                          {isEnabled ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        {entry.provider}
                        {entry.issuer ? ` · ${entry.issuer}` : ''}
                      </p>
                      {current?.account_reference && (
                        <p className="mt-2 text-xs text-neutral-500">
                          Referencia: {current.account_reference}
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <label className="mt-4 block text-xs font-semibold text-neutral-700">
                      Referencia de cuenta{' '}
                      <span className="font-normal text-neutral-400">(opcional)</span>
                      <input
                        autoFocus
                        className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-normal outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50"
                        maxLength={120}
                        onChange={(event) => setReference(event.target.value)}
                        placeholder="Ej. número o alias interno"
                        value={reference}
                      />
                    </label>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {!isEnabled && !isEditing && (
                      <button
                        className="rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                        onClick={() => beginEdit(entry.code)}
                        type="button"
                      >
                        Activar
                      </button>
                    )}
                    {isEnabled && !isEditing && (
                      <>
                        <button
                          className="rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                          onClick={() => beginEdit(entry.code)}
                          type="button"
                        >
                          Configurar
                        </button>
                        <button
                          className="rounded-xl px-3.5 py-2 text-sm font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
                          disabled={isBusy}
                          onClick={() => actions.deactivate.mutate(current.id)}
                          type="button"
                        >
                          Desactivar
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <button
                          className="rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                          disabled={isBusy}
                          onClick={() => save(entry, current)}
                          type="button"
                        >
                          {isBusy ? 'Guardando…' : isEnabled ? 'Guardar' : 'Activar'}
                        </button>
                        <button
                          className="rounded-xl px-3.5 py-2 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-100"
                          disabled={isBusy}
                          onClick={() => setEditingCode(null)}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function errorMessage(error: Error | null): string | null {
  if (!error) return null;
  if (error instanceof ApiRequestError && error.code === 'PLAN_LIMIT_EXCEEDED') {
    return 'Tu plan ya alcanzó el máximo de billeteras activas. Desactiva una o mejora tu membresía.';
  }
  return error instanceof ApiRequestError
    ? error.message
    : 'No pudimos guardar el cambio. Inténtalo nuevamente.';
}

function LoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-8 sm:px-6">
      <p className="text-sm text-danger-600">No pudimos cargar las billeteras.</p>
      <button className="text-sm font-semibold text-brand-600" onClick={onRetry} type="button">
        Reintentar
      </button>
    </div>
  );
}

function WalletsSkeleton() {
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3" role="status">
      {[0, 1, 2].map((item) => (
        <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" key={item} />
      ))}
      <span className="sr-only">Cargando billeteras</span>
    </div>
  );
}
