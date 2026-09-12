'use client';

import type { AssignableRole } from '@yallego/contracts';
import { useState, type FormEvent } from 'react';

import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

import { roleLabel } from './RoleBadge';

const assignableRoles: AssignableRole[] = ['ADMIN', 'OPERATOR', 'VIEWER'];
const roleDescriptions: Record<AssignableRole, string> = {
  ADMIN: 'Puede configurar dispositivos, billeteras, integraciones y gestionar el equipo.',
  OPERATOR: 'Puede revisar y validar cobros, pero no cambiar la configuración del negocio.',
  VIEWER: 'Puede consultar información y exportarla, sin modificar datos.',
};

interface InviteMemberDialogProps {
  error?: string;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: { email: string; role: AssignableRole }) => void;
}

export function InviteMemberDialog({
  error,
  isPending,
  onClose,
  onSubmit,
}: Readonly<InviteMemberDialogProps>) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AssignableRole>('OPERATOR');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({ email, role });
  }

  return (
    <div
      aria-labelledby="invite-member-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-xl font-bold tracking-tight text-neutral-950"
              id="invite-member-title"
            >
              Invitar integrante
            </h2>
            <p className="mt-1 text-sm leading-5 text-neutral-500">
              Le enviaremos un acceso para este negocio.
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            <DashboardIcon className="h-4 w-4" name="x" />
          </button>
        </div>

        <label className="mt-6 block text-sm font-semibold text-neutral-700" htmlFor="invite-email">
          Correo electrónico
        </label>
        <input
          autoComplete="email"
          autoFocus
          className="mt-2 w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
          disabled={isPending}
          id="invite-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="persona@negocio.pe"
          required
          type="email"
          value={email}
        />

        <label className="mt-5 block text-sm font-semibold text-neutral-700" htmlFor="invite-role">
          Rol inicial
        </label>
        <select
          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
          disabled={isPending}
          id="invite-role"
          onChange={(event) => setRole(event.target.value as AssignableRole)}
          value={role}
        >
          {assignableRoles.map((option) => (
            <option key={option} value={option}>
              {roleLabel(option)}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs leading-5 text-neutral-500">{roleDescriptions[role]}</p>

        {error && (
          <p
            className="mt-4 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600"
            role="alert"
          >
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
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  );
}
