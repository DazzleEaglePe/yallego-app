'use client';

import type { ForgotPasswordInput, LoginInput, RegisterInput } from '@yallego/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { FormField } from '@/shared/components/FormField';

import { ApiRequestError, apiRequest } from './api';
import { useAuthSession } from './auth-session';

const verificationRequests = new Map<string, Promise<unknown>>();

export function LoginForm() {
  const router = useRouter();
  const { login, status } = useAuthSession();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/inicio');
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const input: LoginInput = {
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
    };

    try {
      await login(input);
      router.replace('/inicio');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        autoComplete="email"
        id="email"
        label="Correo electrónico"
        name="email"
        placeholder="tu@negocio.pe"
        required
        type="email"
      />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-700" htmlFor="password">
            Contraseña
          </label>
          <Link
            className="rounded text-xs font-medium text-brand-600 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            href="/recuperar-clave"
          >
            ¿La olvidaste?
          </Link>
        </div>
        <input
          autoComplete="current-password"
          className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          id="password"
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </div>
      <FormMessage message={error} tone="error" />
      <SubmitButton disabled={submitting || status === 'loading'}>
        {submitting ? 'Ingresando…' : status === 'loading' ? 'Comprobando sesión…' : 'Ingresar'}
      </SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState<string>();
  const [registeredEmail, setRegisteredEmail] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const input: RegisterInput = {
      business_name: String(data.get('business_name') ?? ''),
      email: String(data.get('email') ?? ''),
      full_name: String(data.get('full_name') ?? ''),
      password: String(data.get('password') ?? ''),
    };

    try {
      await apiRequest('/auth/register', {
        body: JSON.stringify(input),
        method: 'POST',
      });
      setRegisteredEmail(input.email);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <div aria-live="polite">
        <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-sm leading-6 text-success-900">
          <p className="font-semibold">Revisa tu correo</p>
          <p className="mt-1">
            Enviamos un enlace de verificación a <strong>{registeredEmail}</strong>. Ábrelo para
            activar tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormField
        autoComplete="organization"
        id="business-name"
        label="Nombre de tu negocio"
        maxLength={200}
        name="business_name"
        placeholder="Bodega Santa Rosa"
        required
      />
      <FormField
        autoComplete="name"
        id="full-name"
        label="Tu nombre"
        maxLength={200}
        name="full_name"
        placeholder="María Quispe"
        required
      />
      <FormField
        autoComplete="email"
        id="register-email"
        label="Correo electrónico"
        maxLength={254}
        name="email"
        placeholder="tu@negocio.pe"
        required
        type="email"
      />
      <FormField
        autoComplete="new-password"
        id="register-password"
        label="Contraseña"
        maxLength={128}
        minLength={10}
        name="password"
        required
        type="password"
      />
      <p className="text-xs leading-5 text-neutral-500">
        Usa al menos 10 caracteres. No exigimos reglas arbitrarias de símbolos o mayúsculas.
      </p>
      <FormMessage message={error} tone="error" />
      <SubmitButton disabled={submitting}>
        {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </SubmitButton>
    </form>
  );
}

export function RecoverPasswordForm() {
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);

    const data = new FormData(event.currentTarget);
    const input: ForgotPasswordInput = { email: String(data.get('email') ?? '') };

    try {
      await apiRequest('/auth/forgot-password', {
        body: JSON.stringify(input),
        method: 'POST',
      });
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div aria-live="polite">
        <FormMessage
          message="Si existe una cuenta con ese correo, recibirás un enlace válido durante 60 minutos."
          tone="success"
        />
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        autoComplete="email"
        id="recover-email"
        label="Correo electrónico"
        maxLength={254}
        name="email"
        placeholder="tu@negocio.pe"
        required
        type="email"
      />
      <FormMessage message={error} tone="error" />
      <SubmitButton disabled={submitting}>
        {submitting ? 'Enviando…' : 'Enviar enlace'}
      </SubmitButton>
    </form>
  );
}

export function VerifyEmailStatus({ token }: Readonly<{ token?: string }>) {
  const [result, setResult] = useState<{
    message: string;
    status: 'error' | 'loading' | 'success';
  }>({ message: 'Estamos verificando tu correo…', status: 'loading' });

  useEffect(() => {
    if (!token) {
      setResult({ message: 'El enlace de verificación no es válido.', status: 'error' });
      return;
    }

    let active = true;
    let request = verificationRequests.get(token);
    if (!request) {
      request = apiRequest('/auth/verify-email', {
        body: JSON.stringify({ token }),
        method: 'POST',
      });
      verificationRequests.set(token, request);
    }

    void request
      .then(() => {
        if (active) {
          setResult({
            message: 'Tu correo quedó verificado. Ya puedes ingresar a Yallegó.',
            status: 'success',
          });
        }
      })
      .catch((caught) => {
        if (active) setResult({ message: errorMessage(caught), status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div aria-live="polite">
      {result.status === 'loading' ? (
        <div className="py-2 text-center" role="status">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-neutral-500">{result.message}</p>
        </div>
      ) : (
        <FormMessage message={result.message} tone={result.status} />
      )}
      {result.status !== 'loading' && (
        <Link
          className="mt-6 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
          href="/login"
        >
          Ir al ingreso
        </Link>
      )}
    </div>
  );
}

export function VerifyEmailFromFragment() {
  const token = useFragmentToken();

  if (token === null) return <LoadingMessage message="Estamos verificando tu correo…" />;
  return <VerifyEmailStatus token={token} />;
}

export function ResetPasswordForm({ token }: Readonly<{ token?: string }>) {
  const [error, setError] = useState<string>();
  const [reset, setReset] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError('El enlace para restablecer la contraseña no es válido.');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    const data = new FormData(event.currentTarget);

    try {
      await apiRequest('/auth/reset-password', {
        body: JSON.stringify({ password: String(data.get('password') ?? ''), token }),
        method: 'POST',
      });
      setReset(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  if (reset) {
    return (
      <div aria-live="polite">
        <FormMessage
          message="Tu contraseña fue actualizada. Ya puedes ingresar con la nueva clave."
          tone="success"
        />
        <Link
          className="mt-6 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
          href="/login"
        >
          Ir al ingreso
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <FormField
        autoComplete="new-password"
        disabled={!token}
        id="new-password"
        label="Nueva contraseña"
        maxLength={128}
        minLength={10}
        name="password"
        required
        type="password"
      />
      <p className="text-xs leading-5 text-neutral-500">Usa entre 10 y 128 caracteres.</p>
      <FormMessage
        message={
          error ?? (!token ? 'El enlace para restablecer la contraseña no es válido.' : undefined)
        }
        tone="error"
      />
      <SubmitButton disabled={submitting || !token}>
        {submitting ? 'Actualizando…' : 'Actualizar contraseña'}
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordFromFragment() {
  const token = useFragmentToken();

  if (token === null) return <LoadingMessage message="Estamos validando el enlace…" />;
  return <ResetPasswordForm token={token} />;
}

function LoadingMessage({ message }: Readonly<{ message: string }>) {
  return (
    <div className="py-2 text-center" role="status">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <p className="mt-4 text-sm text-neutral-500">{message}</p>
    </div>
  );
}

function useFragmentToken(): null | string | undefined {
  const [token, setToken] = useState<null | string | undefined>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const value = fragment.get('token') ?? undefined;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setToken(value);
  }, []);

  return token;
}

function SubmitButton({
  children,
  disabled,
}: Readonly<{ children: React.ReactNode; disabled: boolean }>) {
  return (
    <button
      className="h-11 w-full rounded-md bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-neutral-300"
      disabled={disabled}
      type="submit"
    >
      {children}
    </button>
  );
}

function FormMessage({ message, tone }: Readonly<{ message?: string; tone: 'error' | 'success' }>) {
  if (!message) return null;

  return (
    <p
      className={`rounded-md border p-3 text-sm leading-5 ${
        tone === 'success'
          ? 'border-success-200 bg-success-50 text-success-900'
          : 'border-danger-200 bg-danger-50 text-danger-900'
      }`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {message}
    </p>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'Ocurrió un error inesperado. Inténtalo nuevamente.';
}
