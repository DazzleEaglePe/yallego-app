'use client';

interface ConfirmTeamActionDialogProps {
  body: string;
  confirmLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function ConfirmTeamActionDialog({
  body,
  confirmLabel,
  isPending,
  onCancel,
  onConfirm,
  title,
}: Readonly<ConfirmTeamActionDialogProps>) {
  return (
    <div
      aria-labelledby="confirm-team-action-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-neutral-950" id="confirm-team-action-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">{body}</p>
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
            {isPending ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
