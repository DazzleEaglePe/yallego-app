import type { ReactNode } from 'react';

import { BrandMark } from './BrandMark';

interface AuthCardProps {
  children: ReactNode;
  description: string;
  title: string;
}

export function AuthCard({ children, description, title }: AuthCardProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4 py-12">
      <div
        aria-hidden="true"
        className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-brand-100 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-info-50 blur-3xl"
      />
      <section className="relative w-full max-w-[420px] rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <BrandMark />
        <div className="mt-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-2 text-sm leading-5 text-neutral-500">{description}</p>
        </div>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}
