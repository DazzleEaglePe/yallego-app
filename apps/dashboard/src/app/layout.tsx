import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';

import { AuthSessionProvider } from '@/features/auth/auth-session';
import { QueryProvider } from '@/shared/providers/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Yallegó',
    template: '%s · Yallegó',
  },
  description: 'Valida tus cobros por billeteras digitales en tiempo real.',
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // La CSP usa un nonce distinto por solicitud; el renderizado dinámico permite
  // que Next.js lo aplique también a sus scripts internos.
  await connection();

  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body>
        <QueryProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
