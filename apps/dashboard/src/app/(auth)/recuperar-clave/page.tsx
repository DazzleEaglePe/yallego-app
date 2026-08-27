import type { Metadata } from 'next';
import Link from 'next/link';

import { RecoverPasswordForm } from '@/features/auth/auth-forms';
import { AuthCard } from '@/shared/components/AuthCard';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function RecoverPasswordPage() {
  return (
    <AuthCard
      description="Te enviaremos un enlace que será válido durante 60 minutos."
      title="Recupera tu contraseña"
    >
      <RecoverPasswordForm />
      <Link
        className="mt-6 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
        href="/login"
      >
        Volver a ingresar
      </Link>
    </AuthCard>
  );
}
