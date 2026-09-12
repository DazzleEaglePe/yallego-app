/** Cursor por conjunto de claves sobre `(created_at desc, id desc)`. */
export interface AuditCursor {
  createdAt: Date;
  id: string;
}

export function encodeCursor(cursor: AuditCursor): string {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, 'utf8').toString(
    'base64url',
  );
}

export function decodeCursor(raw: string): AuditCursor | null {
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const [createdAtRaw, id] = decoded.split('|');
    if (!createdAtRaw || !id) return null;
    const createdAt = new Date(createdAtRaw);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}
