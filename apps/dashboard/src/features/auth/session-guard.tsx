'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { useAuthSession } from './auth-session';

export function SessionGuard({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { status } = useAuthSession();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [router, status]);

  if (status !== 'authenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-50 px-4">
        <div className="text-center" role="status">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-neutral-500">Comprobando tu sesión…</p>
        </div>
      </main>
    );
  }

  return children;
}
