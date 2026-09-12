'use client';

import { useState } from 'react';

interface WebhookSecretDialogProps {
  isRotation: boolean;
  onClose: () => void;
  secret: string;
}

export function WebhookSecretDialog({
  isRotation,
  onClose,
  secret,
}: Readonly<WebhookSecretDialogProps>) {
  const [copyStatus, setCopyStatus] = useState<'copied' | 'error' | 'idle'>('idle');

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  }

  return (
    <div
      aria-labelledby="webhook-secret-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/55 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <span className="inline-flex rounded-full bg-success-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-success-600">
          {isRotation ? 'Secreto rotado' : 'Webhook creado'}
        </span>
        <h2 className="mt-4 text-xl font-bold text-neutral-950" id="webhook-secret-title">
          Guarda el secreto de firma
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          No volveremos a mostrarlo. Úsalo para verificar la cabecera de firma de cada evento.
          {isRotation && ' El secreto anterior seguirá siendo válido durante 24 horas.'}
        </p>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-950 p-4">
          <code className="block break-all text-sm leading-6 text-brand-200">{secret}</code>
        </div>

        {copyStatus === 'error' && (
          <p className="mt-3 text-sm text-danger-600" role="alert">
            No pudimos copiarlo automáticamente. Selecciona el texto y cópialo manualmente.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            onClick={() => void copySecret()}
            type="button"
          >
            {copyStatus === 'copied' ? 'Copiado' : 'Copiar secreto'}
          </button>
          <button
            className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            onClick={onClose}
            type="button"
          >
            Ya lo guardé
          </button>
        </div>
      </div>
    </div>
  );
}
