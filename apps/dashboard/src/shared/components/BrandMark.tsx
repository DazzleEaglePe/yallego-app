import Link from 'next/link';

interface BrandMarkProps {
  compact?: boolean;
  inverse?: boolean;
}

export function BrandMark({ compact = false, inverse = false }: BrandMarkProps) {
  return (
    <Link
      className={`inline-flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-4 ${inverse ? 'focus:ring-offset-neutral-950' : 'focus:ring-offset-white'}`}
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
          <span
            className={`block text-lg font-bold tracking-tight ${inverse ? 'text-white' : 'text-neutral-900'}`}
          >
            Yallegó
          </span>
          <span className={`block text-xs ${inverse ? 'text-neutral-400' : 'text-neutral-500'}`}>
            ¿Ya llegó?
          </span>
        </span>
      )}
    </Link>
  );
}
