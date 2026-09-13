import { createHash } from 'node:crypto';

/**
 * Huella determinista de una notificación cruda. Si la app reenvía el mismo
 * evento (reintento sin confirmación previa), produce el mismo hash y el
 * índice único `(device_id, dedupe_hash)` evita una transacción duplicada.
 */
export function computeDedupeHash(input: {
  packageName: string;
  title: string | null;
  body: string | null;
  postedAt: Date;
}): string {
  const canonical = [
    input.packageName,
    input.title ?? '',
    input.body ?? '',
    input.postedAt.toISOString(),
  ].join('|');

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
