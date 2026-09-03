'use client';

import { can, type WebhookEndpointSummary } from '@yallego/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ApiRequestError } from '@/features/auth/api';
import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { IntegrationsTabs } from '@/features/integrations/components/IntegrationsTabs';
import { WebhookDeliveriesPanel } from '@/features/webhooks/components/WebhookDeliveriesPanel';
import { WebhookFormDialog } from '@/features/webhooks/components/WebhookFormDialog';
import { WebhookSecretDialog } from '@/features/webhooks/components/WebhookSecretDialog';
import { useWebhookActions, useWebhooks } from '@/features/webhooks/hooks/use-webhooks';
import { webhookEventLabel, webhookHealth } from '@/features/webhooks/webhook-config';

type Confirmation =
  | { kind: 'delete'; webhook: WebhookEndpointSummary }
  | { kind: 'rotate'; webhook: WebhookEndpointSummary };

export default function WebhooksPage() {
  const router = useRouter();
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role;
  const hasAccess = role !== undefined && can(role, 'webhooks:manage');
  const webhooks = useWebhooks();
  const actions = useWebhookActions();
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebhookEndpointSummary | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [secretResult, setSecretResult] = useState<{
    isRotation: boolean;
    secret: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null);

  useEffect(() => {
    if (role !== undefined && !hasAccess) router.replace('/inicio');
  }, [hasAccess, role, router]);

  if (!hasAccess) return null;

  const webhookList = webhooks.data ?? [];
  const actionError = firstError(
    actions.update.error,
    actions.remove.error,
    actions.rotateSecret.error,
    actions.test.error,
  );

  function confirmAction() {
    if (!confirmation) return;

    if (confirmation.kind === 'delete') {
      actions.remove.mutate(confirmation.webhook.id, {
        onSuccess: () => {
          setConfirmation(null);
          setNotice('Webhook eliminado.');
        },
      });
      return;
    }

    actions.rotateSecret.mutate(confirmation.webhook.id, {
      onSuccess: (result) => {
        setConfirmation(null);
        setSecretResult({ isRotation: true, secret: result.secret });
      },
    });
  }

  return (
    <div className="pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-500" name="plug" />
            <p className="text-sm font-semibold text-brand-600">Integraciones</p>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-neutral-950 sm:text-4xl">
            Webhooks
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
            Envía los eventos de Yallegó a tus sistemas en cuanto suceden.
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
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          Crear webhook
        </button>
      </section>

      <IntegrationsTabs active="webhooks" />

      {notice && (
        <div
          className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-700"
          role="status"
        >
          <span>{notice}</span>
          <button
            aria-label="Cerrar aviso"
            className="font-bold text-success-600"
            onClick={() => setNotice(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {actionError && !confirmation && (
        <p
          className="mt-5 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">Endpoints</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {webhookList.length}{' '}
              {webhookList.length === 1 ? 'destino configurado' : 'destinos configurados'}
            </p>
          </div>
          <p className="text-xs text-neutral-400">Sólo se permiten direcciones HTTPS públicas.</p>
        </div>

        {webhooks.isLoading && <WebhooksSkeleton />}

        {webhooks.isError && (
          <LoadError
            message="No pudimos cargar los webhooks."
            onRetry={() => void webhooks.refetch()}
          />
        )}

        {!webhooks.isLoading && !webhooks.isError && webhookList.length === 0 && (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <DashboardIcon className="h-5 w-5" name="plug" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-neutral-950">Aún no hay webhooks</h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-neutral-500">
              Registra una dirección HTTPS y elige qué eventos debe recibir tu sistema.
            </p>
          </div>
        )}

        {!webhooks.isLoading && !webhooks.isError && webhookList.length > 0 && (
          <div className="divide-y divide-neutral-100">
            {webhookList.map((webhook) => (
              <WebhookRow
                isDeliveriesOpen={expandedWebhookId === webhook.id}
                isBusy={isAnyActionPending(actions)}
                key={webhook.id}
                onDelete={() => {
                  actions.remove.reset();
                  setConfirmation({ kind: 'delete', webhook });
                }}
                onEdit={() => {
                  actions.update.reset();
                  setEditTarget(webhook);
                }}
                onToggleDeliveries={() =>
                  setExpandedWebhookId((current) => (current === webhook.id ? null : webhook.id))
                }
                onRotate={() => {
                  actions.rotateSecret.reset();
                  setConfirmation({ kind: 'rotate', webhook });
                }}
                onTest={() => {
                  setNotice(null);
                  actions.test.reset();
                  actions.test.mutate(webhook.id, {
                    onSuccess: () => setNotice(`Evento de prueba encolado para ${webhook.url}.`),
                  });
                }}
                onToggle={() =>
                  actions.update.mutate(
                    { input: { is_enabled: !webhook.is_enabled }, webhookId: webhook.id },
                    {
                      onSuccess: () =>
                        setNotice(webhook.is_enabled ? 'Webhook pausado.' : 'Webhook activado.'),
                    },
                  )
                }
                webhook={webhook}
              />
            ))}
          </div>
        )}
      </section>

      {isCreateOpen && (
        <WebhookFormDialog
          error={errorMessage(actions.create.error)}
          isPending={actions.create.isPending}
          onClose={() => setCreateOpen(false)}
          onCreate={(input) =>
            actions.create.mutate(input, {
              onSuccess: (result) => {
                setCreateOpen(false);
                setSecretResult({ isRotation: false, secret: result.secret });
              },
            })
          }
          onUpdate={() => undefined}
        />
      )}

      {editTarget && (
        <WebhookFormDialog
          error={errorMessage(actions.update.error)}
          isPending={actions.update.isPending}
          onClose={() => setEditTarget(null)}
          onCreate={() => undefined}
          onUpdate={(input) =>
            actions.update.mutate(
              { input, webhookId: editTarget.id },
              {
                onSuccess: () => {
                  setEditTarget(null);
                  setNotice('Webhook actualizado.');
                },
              },
            )
          }
          webhook={editTarget}
        />
      )}

      {secretResult && (
        <WebhookSecretDialog
          isRotation={secretResult.isRotation}
          onClose={() => setSecretResult(null)}
          secret={secretResult.secret}
        />
      )}

      {confirmation && (
        <ConfirmWebhookActionDialog
          action={confirmation.kind}
          error={errorMessage(
            confirmation.kind === 'delete' ? actions.remove.error : actions.rotateSecret.error,
          )}
          isPending={actions.remove.isPending || actions.rotateSecret.isPending}
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmAction}
          webhook={confirmation.webhook}
        />
      )}
    </div>
  );
}

function WebhookRow({
  isDeliveriesOpen,
  isBusy,
  onDelete,
  onEdit,
  onRotate,
  onTest,
  onToggle,
  onToggleDeliveries,
  webhook,
}: Readonly<{
  isDeliveriesOpen: boolean;
  isBusy: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onRotate: () => void;
  onTest: () => void;
  onToggle: () => void;
  onToggleDeliveries: () => void;
  webhook: WebhookEndpointSummary;
}>) {
  const health = webhookHealth(webhook);
  const healthMeta = webhookHealthMeta[health];

  return (
    <article>
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 xl:flex-row xl:items-start">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 text-brand-300">
          <DashboardIcon className="h-5 w-5" name="plug" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-all text-sm font-semibold text-neutral-950">{webhook.url}</h3>
            <span className={healthMeta.className}>{healthMeta.label}</span>
          </div>
          {webhook.description && (
            <p className="mt-1 text-sm leading-6 text-neutral-500">{webhook.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {webhook.subscribed_events.map((event) => (
              <span
                className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600"
                key={event}
              >
                {webhookEventLabel(event)}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-400">
            <span>
              Último éxito:{' '}
              <strong className="font-medium text-neutral-600">
                {webhook.last_success_at ? formatDateTime(webhook.last_success_at) : 'Sin envíos'}
              </strong>
            </span>
            <span>
              Fallos consecutivos:{' '}
              <strong className="font-medium text-neutral-600">
                {webhook.consecutive_failures}
              </strong>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
          <ActionButton
            disabled={false}
            label={isDeliveriesOpen ? 'Ocultar entregas' : 'Ver entregas'}
            onClick={onToggleDeliveries}
          />
          <ActionButton disabled={isBusy} label="Editar" onClick={onEdit} />
          <ActionButton
            disabled={isBusy || !webhook.is_enabled}
            label="Enviar prueba"
            onClick={onTest}
          />
          <ActionButton
            disabled={isBusy}
            label={webhook.is_enabled ? 'Pausar' : 'Activar'}
            onClick={onToggle}
          />
          <ActionButton disabled={isBusy} label="Rotar secreto" onClick={onRotate} />
          <button
            className="rounded-lg px-3 py-2 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
            disabled={isBusy}
            onClick={onDelete}
            type="button"
          >
            Eliminar
          </button>
        </div>
      </div>
      {isDeliveriesOpen && <WebhookDeliveriesPanel webhookId={webhook.id} />}
    </article>
  );
}

function ActionButton({
  disabled,
  label,
  onClick,
}: Readonly<{ disabled: boolean; label: string; onClick: () => void }>) {
  return (
    <button
      className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ConfirmWebhookActionDialog({
  action,
  error,
  isPending,
  onCancel,
  onConfirm,
  webhook,
}: Readonly<{
  action: 'delete' | 'rotate';
  error?: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  webhook: WebhookEndpointSummary;
}>) {
  const isDelete = action === 'delete';

  return (
    <div
      aria-labelledby="confirm-webhook-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-neutral-950" id="confirm-webhook-title">
          {isDelete ? '¿Eliminar webhook?' : '¿Rotar el secreto?'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {isDelete
            ? `${webhook.url} dejará de recibir eventos de inmediato.`
            : 'Deberás actualizar el secreto en tu sistema. El valor anterior seguirá funcionando durante 24 horas.'}
        </p>
        {error && (
          <p
            className="mt-3 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600"
            role="alert"
          >
            {error}
          </p>
        )}
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
            {isPending ? 'Procesando…' : isDelete ? 'Eliminar webhook' : 'Rotar secreto'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WebhooksSkeleton() {
  return (
    <div className="divide-y divide-neutral-100" role="status">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="flex animate-pulse items-center gap-4 px-6 py-5" key={index}>
          <span className="h-11 w-11 rounded-xl bg-neutral-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-72 max-w-full rounded bg-neutral-100" />
            <span className="block h-3 w-48 max-w-full rounded bg-neutral-100" />
          </span>
        </div>
      ))}
      <span className="sr-only">Cargando webhooks…</span>
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

function isAnyActionPending(actions: ReturnType<typeof useWebhookActions>): boolean {
  return (
    actions.remove.isPending ||
    actions.rotateSecret.isPending ||
    actions.test.isPending ||
    actions.update.isPending
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiRequestError) return error.message;
  return 'No pudimos completar la acción. Inténtalo nuevamente.';
}

function firstError(...errors: unknown[]): string | undefined {
  for (const error of errors) {
    const message = errorMessage(error);
    if (message) return message;
  }
  return undefined;
}

const webhookHealthMeta = {
  disabled: {
    className: 'rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500',
    label: 'Pausado',
  },
  failing: {
    className: 'rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-600',
    label: 'Con fallos',
  },
  healthy: {
    className: 'rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-600',
    label: 'Operativo',
  },
  new: {
    className: 'rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600',
    label: 'Nuevo',
  },
} as const;
