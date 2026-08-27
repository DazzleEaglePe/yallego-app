import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/features/auth/auth-forms';
import { AuthCard } from '@/shared/components/AuthCard';

export const metadata: Metadata = { title: 'Ingresar' };

export default function LoginPage() {
  return (
    <AuthCard
      description="Revisa y valida los cobros de tu negocio en tiempo real."
      title="Ingresa a tu cuenta"
    >
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
