'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { useAuthSession } from '@/features/auth/auth-session';
import { BrandMark } from '@/shared/components/BrandMark';

const navigation = [
  'Inicio',
  'Transacciones',
  'Dispositivos',
  'Billeteras',
  'Equipo',
  'Integraciones',
];

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { logout, session } = useAuthSession();
  const tenant = session?.tenants[0];
  const initials = getInitials(session?.user.full_name);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="hidden border-r border-neutral-200 bg-white px-5 py-6 lg:block">
        <BrandMark />
        <nav aria-label="Navegación principal" className="mt-10 space-y-1">
          {navigation.map((item, index) => (
            <span
              className={`block rounded-md px-3 py-2.5 text-sm font-medium ${index === 0 ? 'bg-brand-50 text-brand-700' : 'text-neutral-600'}`}
              key={item}
            >
              {item}
            </span>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex h-16 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 lg:px-8">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <span className="ml-auto truncate text-sm font-medium text-neutral-700">
            {tenant?.business_name ?? 'Mi negocio'}
          </span>
          <button
            aria-label="Cerrar sesión"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 transition hover:bg-brand-200 focus:outline-none focus:ring-4 focus:ring-brand-100"
            onClick={() => void handleLogout()}
            title="Cerrar sesión"
            type="button"
          >
            {initials}
          </button>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function getInitials(fullName?: string): string {
  if (!fullName) return 'YL';

  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
