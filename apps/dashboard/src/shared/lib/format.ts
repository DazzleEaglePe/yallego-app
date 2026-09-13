export function formatCurrency(amount: string, currency: string): string {
  const value = Number(amount);
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(value);
}

export function formatElapsed(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1_000));

  if (seconds < 60) return 'Justo ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}
