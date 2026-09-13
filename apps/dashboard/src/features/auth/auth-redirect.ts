export function resolvePostLoginPath(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/inicio';

  try {
    const parsed = new URL(value, 'https://app.yallego.local');
    return parsed.origin === 'https://app.yallego.local'
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : '/inicio';
  } catch {
    return '/inicio';
  }
}
