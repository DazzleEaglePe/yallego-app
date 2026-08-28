'use client';

import { can, type ApiKeyCreated, type ApiKeySummary } from '@yallego/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiKeyCreatedDialog } from '@/features/api-keys/components/ApiKeyCreatedDialog';
import { CreateApiKeyDialog } from '@/features/api-keys/components/CreateApiKeyDialog';
import { apiKeyScopeLabel, apiKeyStatus } from '@/features/api-keys/api-key-config';
import { useApiKeyActions, useApiKeys } from '@/features/api-keys/hooks/use-api-keys';
import { ApiRequestError } from '@/features/auth/api';
import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { IntegrationsTabs } from '@/features/integrations/components/IntegrationsTabs';

export default function ApiKeysPage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role;
  const hasAccess = role !== undefined && can(role, 'api-keys:manage');
  const apiKeys = useApiKeys();
  const actions = useApiKeyActions();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null);

  useEffect(() => {
    if (role !== undefined && !hasAccess) router.replace('/inicio');
  }, [hasAccess, role, router]);

  if (!hasAccess) return null;

  const keyList = apiKeys.data ?? [];

  return (
    <div className="pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-500" name="plug" />
            <p className="text-sm font-semibold text-brand-600">Integraciones</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
            Claves API
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Conecta sistemas externos sin compartir las credenciales de tu cuenta.
          </p>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
          onClick={() => {
            actions.create.reset();
            setCreateOpen(true);
          }}
          type="button"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Crear clave
        </button>
      </section>

      <IntegrationsTabs active="api-keys" />

      <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">Claves activas</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {keyList.length} {keyList.length === 1 ? 'integración conectada' : 'integraciones conectadas'}
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
            Los secretos se muestran una sola vez
          </span>
        </div>

        {apiKeys.isLoading && <ApiKeysSkeleton />}

        {apiKeys.isError && (
          <LoadError message="No pudimos cargar las claves API." onRetry={() => void apiKeys.refetch()} />
        )}

        {!apiKeys.isLoading && !apiKeys.isError && keyList.length === 0 && (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <DashboardIcon className="h-5 w-5" name="plug" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-neutral-950">Aún no hay claves API</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-neutral-500">
              Crea una clave con los permisos mínimos para conectar tu primera integración.
            </p>
          </div>
        )}

        {!apiKeys.isLoading && !apiKeys.isError && keyList.length > 0 && (
          <div className="divide-y divide-neutral-100">
            {keyList.map((apiKey) => (
              <ApiKeyRow
                apiKey={apiKey}
                isBusy={actions.revoke.isPending}
                key={apiKey.id}
                onRevoke={() => {
                  actions.revoke.reset();
                  setRevokeTarget(apiKey);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {isCreateOpen && (
        <CreateApiKeyDialog
          error={errorMessage(actions.create.error)}
          isPending={actions.create.isPending}
          onClose={() => setCreateOpen(false)}
          onSubmit={(input) =>
            actions.create.mutate(input, {
              onSuccess: (apiKey) => {
                setCreateOpen(false);
                setCreatedKey(apiKey);
              },
            })
          }
        />
      )}

      {createdKey && (
        <ApiKeyCreatedDialog apiKey={createdKey} onClose={() => setCreatedKey(null)} />
      )}

      {revokeTarget && (
        <RevokeApiKeyDialog
          apiKey={revokeTarget}
          error={errorMessage(actions.revoke.error)}
          isPending={actions.revoke.isPending}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() =>
            actions.revoke.mutate(revokeTarget.id, {
              onSuccess: () => setRevokeTarget(null),
            })
          }
        />
      )}
    </div>
  );
}

function ApiKeyRow({
  apiKey,
  isBusy,
  onRevoke,
}: Readonly<{ apiKey: ApiKeySummary; isBusy: boolean; onRevoke: () => void }>) {
  const status = apiKeyStatus(apiKey);

  return (
    <article className="px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 text-brand-300">
          <DashboardIcon className="h-5 w-5" name="plug" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-neutral-950">{apiKey.label}</h3>
            <span
              className={
                status === 'active'
                  ? 'rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-600'
                  : 'rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-600'
              }
            >
              {status === 'active' ? 'Activa' : 'Vencida'}
            </span>
          </div>
          <code className="mt-1 block text-xs text-neutral-500">{apiKey.key_prefix}••••••••</code>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {apiKey.scopes.map((scope) => (
              <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600" key={scope}>
                {apiKeyScopeLabel(scope)}
              </span>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:min-w-64">
          <dt className="text-neutral-400">Último uso</dt>
          <dd className="text-right font-medium text-neutral-700">
            {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Nunca'}
          </dd>
          <dt className="text-neutral-400">Vencimiento</dt>
          <dd className="text-right font-medium text-neutral-700">
            {apiKey.expires_at ? formatDate(apiKey.expires_at) : 'Sin vencimiento'}
          </dd>
        </dl>
        <button
          className="self-start rounded-lg px-3 py-2 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50 lg:self-center"
          disabled={isBusy}
          onClick={onRevoke}
          type="button"
        >
          Revocar
        </button>
      </div>
    </article>
  );
}

function RevokeApiKeyDialog({
  apiKey,
  error,
  isPending,
  onCancel,
  onConfirm,
}: Readonly<{
  apiKey: ApiKeySummary;
  error?: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  return (
    <div
      aria-labelledby="revoke-api-key-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-neutral-950" id="revoke-api-key-title">
          ¿Revocar {apiKey.label}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          La integración perderá acceso de inmediato. Esta acción no se puede deshacer.
        </p>
        {error && <p className="mt-3 text-sm text-danger-600" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-danger-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-danger-700 disabled:opacity-50"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? 'Revocando…' : 'Revocar clave'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiKeysSkeleton() {
  return (
    <div className="divide-y divide-neutral-100" role="status">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="flex animate-pulse items-center gap-4 px-6 py-5" key={index}>
          <span className="h-11 w-11 rounded-xl bg-neutral-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-40 rounded bg-neutral-100" />
            <span className="block h-3 w-56 max-w-full rounded bg-neutral-100" />
          </span>
        </div>
      ))}
      <span className="sr-only">Cargando claves API…</span>
    </div>
  );
}

function LoadError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-8">
      <p className="text-sm text-danger-600">{message}</p>
      <button className="text-sm font-semibold text-brand-600" onClick={onRetry} type="button">
        Reintentar
      </button>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiRequestError) return error.message;
  return 'No pudimos completar la acción. Inténtalo nuevamente.';
}
