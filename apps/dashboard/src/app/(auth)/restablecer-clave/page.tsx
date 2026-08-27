import type { Metadata } from 'next';

import { ResetPasswordFromFragment } from '@/features/auth/auth-forms';
import { AuthCard } from '@/shared/components/AuthCard';

export const metadata: Metadata = { title: 'Restablecer contraseña' };

export default function ResetPasswordPage() {
  return (
    <AuthCard
      description="Crea una nueva contraseña para recuperar el acceso a tu cuenta."
      title="Nueva contraseña"
    >
      <ResetPasswordFromFragment />
    </AuthCard>
  );
}
