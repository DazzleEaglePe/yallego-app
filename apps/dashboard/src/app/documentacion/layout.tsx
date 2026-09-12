import Link from 'next/link';
import type { ReactNode } from 'react';

import { API_GUIDES } from '@/features/api-docs/api-docs';
import { BrandMark } from '@/shared/components/BrandMark';

export default function DocumentationLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="hidden border-l border-neutral-200 pl-3 text-sm font-medium text-neutral-500 sm:block">
              Documentación
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              className="hidden rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:border-brand-300 hover:text-brand-700 sm:block"
              href="/documentacion/openapi.yaml"
            >
              OpenAPI 3.1
            </a>
            <Link
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              href="/login"
            >
              Ir al panel
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
          <nav aria-label="Guías de integración" className="flex gap-2 overflow-x-auto pb-3 lg:block">
            <Link
              className="block shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-900 hover:bg-white"
              href="/documentacion"
            >
              Descripción general
            </Link>
            {API_GUIDES.map((guide) => (
              <Link
                className="block shrink-0 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-white hover:text-brand-700"
                href={`/documentacion/${guide.slug}`}
                key={guide.slug}
              >
                {guide.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 rounded-2xl border border-neutral-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
