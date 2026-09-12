'use client';

import { useState, type FormEvent } from 'react';

import type { ApiKeyScope, CreateApiKeyInput } from '@yallego/contracts';

import { apiKeyScopeOptions } from '../api-key-config';

interface CreateApiKeyDialogProps {
  error?: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateApiKeyInput) => void;
}

export function CreateApiKeyDialog({
  error,
  isPending,
  onClose,
  onSubmit,
}: Readonly<CreateApiKeyDialogProps>) {
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['transactions:read']);
  const canSubmit = label.trim().length >= 2 && scopes.length > 0 && !isPending;

  function toggleScope(scope: ApiKeyScope) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      label: label.trim(),
      scopes,
      expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59.999`).toISOString() : null,
    });
  }

  return (
    <div
      aria-labelledby="create-api-key-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        className="my-auto w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-bold text-neutral-950" id="create-api-key-title">
          Crear clave API
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Otorga únicamente los permisos que necesita esta integración.
        </p>

        <label className="mt-5 block text-sm font-semibold text-neutral-800" htmlFor="api-key-label">
          Nombre de la integración
        </label>
        <input
          autoFocus
          className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
          disabled={isPending}
          id="api-key-label"
          maxLength={120}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Ej. Sistema contable"
          value={label}
        />

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-neutral-800">Alcances</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {apiKeyScopeOptions.map((scope) => (
              <label
                className="flex cursor-pointer gap-3 rounded-xl border border-neutral-200 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                key={scope.value}
              >
                <input
                  checked={scopes.includes(scope.value)}
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-400"
                  disabled={isPending}
                  onChange={() => toggleScope(scope.value)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-neutral-800">{scope.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-neutral-500">
                    {scope.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 block text-sm font-semibold text-neutral-800" htmlFor="api-key-expiry">
          Vencimiento <span className="font-normal text-neutral-400">(opcional)</span>
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
          disabled={isPending}
          id="api-key-expiry"
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setExpiresAt(event.target.value)}
          type="date"
          value={expiresAt}
        />

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
            {isPending ? 'Creando…' : 'Crear clave'}
          </button>
        </div>
      </form>
    </div>
  );
}
