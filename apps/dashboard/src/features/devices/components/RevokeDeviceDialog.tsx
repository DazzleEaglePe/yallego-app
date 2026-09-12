'use client';

interface RevokeDeviceDialogProps {
  deviceLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RevokeDeviceDialog({
  deviceLabel,
  isPending,
  onCancel,
  onConfirm,
}: Readonly<RevokeDeviceDialogProps>) {
  return (
    <div
      aria-labelledby="revoke-device-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-neutral-950" id="revoke-device-title">
          Revocar {deviceLabel}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          El dispositivo dejará de poder enviar cobros de inmediato. Para volver a usarlo hará
          falta vincularlo de nuevo con un código nuevo — esta acción no se puede deshacer.
        </p>
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
            className="rounded-xl bg-danger-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-danger-700 disabled:cursor-wait disabled:opacity-60"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? 'Revocando…' : 'Revocar dispositivo'}
          </button>
        </div>
      </div>
    </div>
  );
}
