'use client';

import type { PairingCodeResponse } from '@yallego/contracts';
import { useState } from 'react';

import { ApiRequestError } from '@/features/auth/api';
import { createPairingCode } from '@/features/devices/api/devices';

interface PairDeviceDialogProps {
  accessToken: string;
  onClose: () => void;
}

export function PairDeviceDialog({ accessToken, onClose }: Readonly<PairDeviceDialogProps>) {
  const [result, setResult] = useState<PairingCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function generateCode() {
    setIsCreating(true);
    setError(null);
    setCopyStatus('idle');
    try {
      setResult(await createPairingCode(accessToken));
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'No pudimos generar el código. Inténtalo nuevamente.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function copyCode() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  }

  return (
    <div
      aria-labelledby="pair-device-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/55 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700">
          Vincular Android
        </span>
        <h2 className="mt-4 text-xl font-bold text-neutral-950" id="pair-device-title">
          Conecta el teléfono que recibe tus pagos
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Genera un código de un solo uso y escríbelo en Yallegó desde tu Android.
        </p>

        {!result && (
          <button
            className="mt-6 w-full rounded-xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreating}
            onClick={() => void generateCode()}
            type="button"
          >
            {isCreating ? 'Generando código…' : 'Generar código de vinculación'}
          </button>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">Código de vinculación</p>
            <code className="mt-3 block font-mono text-3xl font-bold tracking-[0.08em] text-neutral-950">
              {result.code}
            </code>
            <p className="mt-3 text-xs leading-5 text-neutral-600">
              Vence a las {new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(result.expires_at))}.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
            {error}
          </p>
        )}

        {copyStatus === 'error' && (
          <p className="mt-3 text-sm text-danger-600" role="alert">
            No pudimos copiarlo automáticamente. Selecciónalo y cópialo manualmente.
          </p>
        )}

        <ol className="mt-6 space-y-2 border-t border-neutral-100 pt-5 text-sm leading-6 text-neutral-600">
          <li>1. Abre Yallegó en tu dispositivo.</li>
          <li>2. Escribe este código en “Código de vinculación”.</li>
          <li>3. Pulsa “Vincular celular”.</li>
        </ol>

        <div className="mt-6 flex justify-end gap-2">
          {result && (
            <button
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              onClick={() => void copyCode()}
              type="button"
            >
              {copyStatus === 'copied' ? 'Código copiado' : 'Copiar código'}
            </button>
          )}
          <button
            className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            onClick={onClose}
            type="button"
          >
            {result ? 'Listo' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
