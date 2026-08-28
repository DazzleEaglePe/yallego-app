import type { Metadata } from 'next';
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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
