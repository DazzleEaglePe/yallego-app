import type { Metadata } from 'next';

import { VerifyEmailFromFragment } from '@/features/auth/auth-forms';
import { AuthCard } from '@/shared/components/AuthCard';

export const metadata: Metadata = { title: 'Verificar correo' };

export default function VerifyEmailPage() {
  return (
    <AuthCard
      description="Confirma tu dirección para proteger tu cuenta y activar el ingreso."
      title="Verifica tu correo"
    >
      <VerifyEmailFromFragment />
    </AuthCard>
  );
}
