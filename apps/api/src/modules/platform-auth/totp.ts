import { createHmac, randomBytes } from 'node:crypto';

import { base32Encode } from './base32';

const STEP_SECONDS = 30;
const DIGITS = 6;
const SECRET_BYTES = 20; // 160 bits — el tamaño recomendado por RFC 4226 §4 para HMAC-SHA1

/** RFC 4226 §5.3: HMAC-SHA1 truncado dinámicamente a `DIGITS` dígitos decimales. */
function hotp(secret: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();

  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** RFC 6238: HOTP con el contador derivado del tiempo (ventanas de 30s). */
function totpCounter(timeSeconds: number): number {
  return Math.floor(timeSeconds / STEP_SECONDS);
}

export function generateTotpSecret(): { secret: Buffer; base32: string } {
  const secret = randomBytes(SECRET_BYTES);
  return { secret, base32: base32Encode(secret) };
}

export function computeTotp(secret: Buffer, timeSeconds: number = Date.now() / 1_000): string {
  return hotp(secret, totpCounter(timeSeconds));
}

/** Acepta el código del paso actual y, por deriva de reloj, `window` pasos antes/después (por defecto ±30s). */
export function verifyTotp(
  secret: Buffer,
  code: string,
  timeSeconds: number = Date.now() / 1_000,
  window = 1,
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = totpCounter(timeSeconds);
  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(secret, counter + offset) === code) return true;
  }
  return false;
}

export function buildOtpAuthUri(input: {
  secretBase32: string;
  accountEmail: string;
  issuer: string;
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.accountEmail}`);
  const params = new URLSearchParams({
    secret: input.secretBase32,
    issuer: input.issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
