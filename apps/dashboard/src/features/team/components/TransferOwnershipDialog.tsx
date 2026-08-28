'use client';

import { useState } from 'react';

import type { Member } from '@yallego/contracts';

interface TransferOwnershipDialogProps {
  error?: string;
  isPending: boolean;
  member: Member;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TransferOwnershipDialog({
  error,
  isPending,
  member,
  onCancel,
  onConfirm,
}: Readonly<TransferOwnershipDialogProps>) {
  const [confirmation, setConfirmation] = useState('');
  const isConfirmed = confirmation.trim().toLowerCase() === member.email.toLowerCase();

  return (
    <div
      aria-labelledby="transfer-ownership-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/55 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-danger-100 bg-white p-6 shadow-2xl">
        <span className="inline-flex rounded-full bg-danger-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-danger-600">
          Acción sensible
        </span>
        <h2 className="mt-4 text-xl font-bold text-neutral-950" id="transfer-ownership-title">
          Transferir la propiedad
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {member.full_name} pasará a ser propietario de este negocio. Tu cuenta conservará acceso
          como administrador, pero ya no podrá realizar acciones exclusivas del propietario.
        </p>

        <label
          className="mt-5 block text-sm font-semibold text-neutral-800"
          htmlFor="transfer-confirmation"
        >
          Escribe <span className="font-bold text-neutral-950">{member.email}</span> para confirmar
        </label>
        <input
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm text-neutral-950 outline-none transition focus:border-danger-500 focus:ring-4 focus:ring-danger-50"
          disabled={isPending}
          id="transfer-confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={member.email}
          value={confirmation}
        />

        {error && (
          <p className="mt-3 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
            disabled={isPending}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-xl bg-danger-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-danger-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isConfirmed || isPending}
            onClick={onConfirm}
            type="button"
          >
            {isPending ? 'Transfiriendo…' : 'Transferir propiedad'}
          </button>
        </div>
      </div>
    </div>
  );
}
