'use client';

import { useState, type FormEvent } from 'react';

import type {
  RegisterWebhookInput,
  UpdateWebhookInput,
  WebhookEndpointSummary,
  WebhookEventType,
} from '@yallego/contracts';

import { webhookEventOptions } from '../webhook-config';

interface WebhookFormDialogProps {
  error?: string;
  isPending: boolean;
  onClose: () => void;
  onCreate: (input: RegisterWebhookInput) => void;
  onUpdate: (input: UpdateWebhookInput) => void;
  webhook?: WebhookEndpointSummary;
}

export function WebhookFormDialog({
  error,
  isPending,
  onClose,
  onCreate,
  onUpdate,
  webhook,
}: Readonly<WebhookFormDialogProps>) {
  const [url, setUrl] = useState(webhook?.url ?? '');
  const [description, setDescription] = useState(webhook?.description ?? '');
  const [events, setEvents] = useState<WebhookEventType[]>(
    webhook?.subscribed_events ?? ['transaction.created'],
  );
  const isEditing = webhook !== undefined;
  const canSubmit =
    events.length > 0 && (isEditing || url.trim().startsWith('https://')) && !isPending;

  function toggleEvent(event: WebhookEventType) {
    setEvents((current) =>
      current.includes(event) ? current.filter((item) => item !== event) : [...current, event],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    if (isEditing) {
      onUpdate({ description: description.trim() || null, subscribed_events: events });
      return;
    }

    onCreate({
      description: description.trim() || undefined,
      subscribed_events: events,
      url: url.trim(),
    });
  }

  return (
    <div
      aria-labelledby="webhook-form-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        className="my-auto w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold text-neutral-950" id="webhook-form-title">
          {isEditing ? 'Editar webhook' : 'Crear webhook'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Yallegó firmará cada evento para que tu sistema pueda verificar su origen.
        </p>

        <label className="mt-5 block text-sm font-semibold text-neutral-800" htmlFor="webhook-url">
          URL de recepción
        </label>
        <input
          autoFocus={!isEditing}
          className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50 disabled:bg-neutral-100 disabled:text-neutral-500"
          disabled={isEditing || isPending}
          id="webhook-url"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://tu-dominio.com/webhooks/yallego"
          type="url"
          value={url}
        />
        {isEditing && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Crea otro webhook si necesitas cambiar la URL.
          </p>
        )}

        <label
          className="mt-5 block text-sm font-semibold text-neutral-800"
          htmlFor="webhook-description"
        >
          Descripción <span className="font-normal text-neutral-400">(opcional)</span>
        </label>
        <textarea
          className="mt-2 min-h-20 w-full resize-y rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
          disabled={isPending}
          id="webhook-description"
          maxLength={500}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ej. Sincroniza cobros con el ERP"
          value={description}
        />

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-neutral-800">Eventos</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {webhookEventOptions.map((event) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 px-3 py-3 text-sm font-medium text-neutral-700 transition hover:border-brand-200 hover:bg-brand-50/40"
                key={event.value}
              >
                <input
                  checked={events.includes(event.value)}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-400"
                  disabled={isPending}
                  onChange={() => toggleEvent(event.value)}
                  type="checkbox"
                />
                {event.label}
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="mt-4 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSubmit}
            type="submit"
          >
            {isPending ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear webhook'}
          </button>
        </div>
      </form>
    </div>
  );
}
