'use client';

import type { ChangePasswordInput, UpdateProfileInput } from '@yallego/contracts';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { changePassword, updateProfile } from '@/features/account/api/account';
import { ApiRequestError } from '@/features/auth/api';
import { useAuthSession } from '@/features/auth/auth-session';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

export default function AccountPage() {
  const router = useRouter();
  const { logout, refreshSession, session } = useAuthSession();
  const [fullName, setFullName] = useState('');
  const [profileMessage, setProfileMessage] = useState<Message>();
  const [passwordMessage, setPasswordMessage] = useState<Message>();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (session) setFullName(session.user.full_name);
  }, [session]);

  if (!session) return null;
  const activeSession = session;

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: UpdateProfileInput = { full_name: fullName.trim() };
    if (input.full_name.length < 2) {
      setProfileMessage({ text: 'Ingresa un nombre de al menos 2 caracteres.', tone: 'error' });
      return;
    }

    setSavingProfile(true);
    setProfileMessage(undefined);
    try {
      await updateProfile(activeSession.accessToken, input);
      await refreshSession();
      setProfileMessage({ text: 'Tu nombre se actualizó correctamente.', tone: 'success' });
    } catch (error) {
      setProfileMessage({ text: requestErrorMessage(error), tone: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get('current_password') ?? '');
    const newPassword = String(form.get('new_password') ?? '');
    const confirmation = String(form.get('password_confirmation') ?? '');

    if (newPassword !== confirmation) {
      setPasswordMessage({ text: 'Las contraseñas nuevas no coinciden.', tone: 'error' });
      return;
    }
    if (newPassword.length < 10) {
      setPasswordMessage({ text: 'La contraseña debe tener al menos 10 caracteres.', tone: 'error' });
      return;
    }

    const input: ChangePasswordInput = {
      current_password: currentPassword,
      new_password: newPassword,
    };
    setSavingPassword(true);
    setPasswordMessage(undefined);
    try {
      await changePassword(activeSession.accessToken, input);
      await logout();
      router.replace('/login?password=updated');
    } catch (error) {
      setPasswordMessage({ text: requestErrorMessage(error), tone: 'error' });
      setSavingPassword(false);
    }
  }

  return (
    <div className="pb-8">
      <section>
        <div className="flex items-center gap-2.5">
          <DashboardIcon className="h-5 w-5 text-brand-500" name="user" />
          <p className="text-sm font-semibold text-brand-600">Tu cuenta</p>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-3xl">
          Cuenta y seguridad
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 sm:text-base">
          Actualiza tu identidad visible y protege el acceso al panel de Yallegó.
        </p>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <form
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7"
          onSubmit={handleProfileSubmit}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <DashboardIcon className="h-5 w-5" name="user" />
            </span>
            <div>
              <h2 className="font-semibold text-neutral-950">Información personal</h2>
              <p className="text-sm text-neutral-500">Así aparecerás en el panel y auditoría.</p>
            </div>
          </div>

          <label className="mt-6 block text-sm font-medium text-neutral-700" htmlFor="full-name">
            Nombre completo
          </label>
          <input
            autoComplete="name"
            className={inputClassName}
            id="full-name"
            maxLength={200}
            onChange={(event) => setFullName(event.target.value)}
            required
            value={fullName}
          />

          <label className="mt-5 block text-sm font-medium text-neutral-700" htmlFor="email">
            Correo de acceso
          </label>
          <input
            className={`${inputClassName} cursor-not-allowed bg-neutral-50 text-neutral-500`}
            disabled
            id="email"
            value={activeSession.user.email}
          />
          <p className="mt-2 text-xs leading-5 text-neutral-400">
            El cambio de correo requerirá una verificación de seguridad y estará disponible en una
            siguiente versión.
          </p>

          <InlineMessage message={profileMessage} />
          <button className={primaryButtonClassName} disabled={savingProfile} type="submit">
            {savingProfile ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>

        <form
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-7"
          onSubmit={handlePasswordSubmit}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-900 text-white">
              <DashboardIcon className="h-5 w-5" name="shield" />
            </span>
            <div>
              <h2 className="font-semibold text-neutral-950">Cambiar contraseña</h2>
              <p className="text-sm text-neutral-500">Se cerrarán las demás sesiones abiertas.</p>
            </div>
          </div>

          <PasswordField autoComplete="current-password" label="Contraseña actual" name="current_password" />
          <PasswordField autoComplete="new-password" label="Nueva contraseña" name="new_password" />
          <PasswordField
            autoComplete="new-password"
            label="Repite la contraseña nueva"
            name="password_confirmation"
          />
          <p className="mt-2 text-xs text-neutral-400">Usa al menos 10 caracteres.</p>

          <InlineMessage message={passwordMessage} />
          <button className={primaryButtonClassName} disabled={savingPassword} type="submit">
            {savingPassword ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </section>
    </div>
  );
}

type Message = { text: string; tone: 'error' | 'success' };

function PasswordField({
  autoComplete,
  label,
  name,
}: {
  autoComplete: string;
  label: string;
  name: string;
}) {
  return (
    <div className="mt-5">
      <label className="block text-sm font-medium text-neutral-700" htmlFor={name}>
        {label}
      </label>
      <input
        autoComplete={autoComplete}
        className={inputClassName}
        id={name}
        maxLength={128}
        name={name}
        required
        type="password"
      />
    </div>
  );
}

function InlineMessage({ message }: { message: Message | undefined }) {
  if (!message) return null;
  return (
    <p
      className={`mt-5 rounded-lg px-3 py-2.5 text-sm ${
        message.tone === 'success'
          ? 'bg-success-50 text-success-700'
          : 'bg-danger-50 text-danger-700'
      }`}
      role="status"
    >
      {message.text}
    </p>
  );
}

function requestErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'No pudimos guardar los cambios. Inténtalo nuevamente.';
}

const inputClassName =
  'mt-2 h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100';
const primaryButtonClassName =
  'mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60';
