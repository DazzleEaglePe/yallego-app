import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * docs/06_API_CONTRACT.md §9.2:
 * `HMAC_SHA256(secreto, "{timestamp}.{cuerpo_crudo}")`, comparación de tiempo
 * constante. Sin dependencias externas — es exactamente lo que el integrador
 * reproduce del otro lado, así que se prueba igual que un parser.
 */
export function computeSignature(secret: string, timestamp: number, rawBody: string): string {
  const message = `${timestamp}.${rawBody}`;
  return createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

export function verifySignature(
  secret: string,
  timestamp: number,
  rawBody: string,
  signature: string,
): boolean {
  const expected = computeSignature(secret, timestamp, rawBody);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
