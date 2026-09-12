import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/features/auth/auth-forms';
import { AuthCard } from '@/shared/components/AuthCard';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const { password } = await searchParams;
  return (
    <AuthCard
      description="Revisa y valida los cobros de tu negocio en tiempo real."
      title="Ingresa a tu cuenta"
    >
      {password === 'updated' && (
        <p className="mb-5 rounded-lg bg-success-50 px-3 py-2.5 text-sm text-success-700">
          Contraseña actualizada. Ingresa nuevamente para continuar.
        </p>
      )}
      <LoginForm />
      <p className="mt-6 text-center text-sm text-neutral-500">
        ¿Aún no tienes cuenta?{' '}
        <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/registro">
          Crea una gratis
        </Link>
      </p>
    </AuthCard>
  );
}
