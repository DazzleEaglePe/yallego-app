import type { Metadata } from 'next';
import Link from 'next/link';

import { RegisterForm } from '@/features/auth/auth-forms';
import { AuthCard } from '@/shared/components/AuthCard';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function RegisterPage() {
  return (
    <AuthCard description="Empieza con el plan Free. No necesitas tarjeta." title="Crea tu cuenta">
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta?{' '}
        <Link className="font-semibold text-brand-600 hover:text-brand-700" href="/login">
          Ingresa
        </Link>
      </p>
    </AuthCard>
  );
}
