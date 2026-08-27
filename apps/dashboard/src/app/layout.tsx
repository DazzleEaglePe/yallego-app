import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthSessionProvider } from '@/features/auth/auth-session';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Yallegó',
    template: '%s · Yallegó',
  },
  description: 'Valida tus cobros por billeteras digitales en tiempo real.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
