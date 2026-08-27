import Link from 'next/link';

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <Link
      className="inline-flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-4"
      href="/"
    >
      <span
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-xl font-bold text-white shadow-sm"
      >
        ¿
      </span>
      {!compact && (
        <span>
          <span className="block text-lg font-bold tracking-tight text-neutral-900">Yallegó</span>
          <span className="block text-xs text-neutral-500">¿Ya llegó?</span>
        </span>
      )}
    </Link>
  );
}
