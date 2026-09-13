/** Cursor por conjunto de claves sobre `(occurred_at desc, id desc)`, el orden del índice principal. */
export interface TransactionCursor {
  occurredAt: Date;
  id: string;
}

export function encodeCursor(cursor: TransactionCursor): string {
  return Buffer.from(`${cursor.occurredAt.toISOString()}|${cursor.id}`, 'utf8').toString(
    'base64url',
  );
}

export function decodeCursor(raw: string): TransactionCursor | null {
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const [occurredAtRaw, id] = decoded.split('|');
    if (!occurredAtRaw || !id) return null;
    const occurredAt = new Date(occurredAtRaw);
    if (Number.isNaN(occurredAt.getTime())) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}
