import Link from 'next/link';

export function IntegrationsTabs({ active }: Readonly<{ active: 'api-keys' | 'webhooks' }>) {
  return (
    <nav
      aria-label="Secciones de integraciones"
      className="mt-7 flex gap-1 overflow-x-auto border-b border-neutral-200"
    >
      <Link
        aria-current={active === 'api-keys' ? 'page' : undefined}
        className={tabClassName(active === 'api-keys')}
        href="/integraciones/claves-api"
      >
        Claves API
      </Link>
      <Link
        aria-current={active === 'webhooks' ? 'page' : undefined}
        className={tabClassName(active === 'webhooks')}
        href="/integraciones/webhooks"
      >
        Webhooks
      </Link>
    </nav>
  );
}

function tabClassName(isActive: boolean): string {
  return isActive
    ? 'shrink-0 border-b-2 border-brand-500 px-4 py-3 text-sm font-semibold text-brand-700'
    : 'shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-neutral-500 transition hover:text-neutral-900';
}
