'use client';

import { useState } from 'react';

import type { ApiKeyCreated } from '@yallego/contracts';

interface ApiKeyCreatedDialogProps {
  apiKey: ApiKeyCreated;
  onClose: () => void;
}

export function ApiKeyCreatedDialog({ apiKey, onClose }: Readonly<ApiKeyCreatedDialogProps>) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  }

  return (
    <div
      aria-labelledby="api-key-created-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/55 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <span className="inline-flex rounded-full bg-success-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-success-600">
          Clave creada
        </span>
        <h2 className="mt-4 text-xl font-bold text-neutral-950" id="api-key-created-title">
          Guarda esta clave ahora
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Por seguridad, Yallegó no volverá a mostrar el valor completo.
        </p>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-950 p-4">
          <code className="block break-all text-sm leading-6 text-brand-200">{apiKey.key}</code>
        </div>

        {copyStatus === 'error' && (
          <p className="mt-3 text-sm text-danger-600" role="alert">
            No pudimos copiarla automáticamente. Selecciona el texto y cópialo manualmente.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            onClick={() => void copyKey()}
            type="button"
          >
            {copyStatus === 'copied' ? 'Copiada' : 'Copiar clave'}
          </button>
          <button
            className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            onClick={onClose}
            type="button"
          >
            Ya la guardé
          </button>
        </div>
      </div>
    </div>
  );
}
