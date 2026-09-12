import { describe, expect, it } from 'vitest';

import { computeTotp, generateTotpSecret, verifyTotp } from './totp';

describe('computeTotp', () => {
  // RFC 6238 Apéndice B, vector T=59 con la semilla ASCII de 20 bytes de la
  // RFC. El vector oficial trunca a 8 dígitos ("94287082"); el proyecto usa
  // el estándar de 6 dígitos de facto (Google Authenticator y similares),
  // que es la misma truncación módulo 10^6: 94287082 % 1_000_000 = 287082.
  const rfcSeed = Buffer.from('12345678901234567890', 'ascii');

  it('matches the RFC 6238 SHA1 test vector at T=59 (truncated to 6 digits)', () => {
    expect(computeTotp(rfcSeed, 59)).toBe('287082');
  });

  it('changes once the 30-second step boundary is crossed', () => {
    const codeAt59 = computeTotp(rfcSeed, 59);
    const codeAt60 = computeTotp(rfcSeed, 60);
    expect(codeAt60).not.toBe(codeAt59);
  });

  it('stays the same within the same 30-second step', () => {
    expect(computeTotp(rfcSeed, 30)).toBe(computeTotp(rfcSeed, 59));
  });
});

describe('verifyTotp', () => {
  const rfcSeed = Buffer.from('12345678901234567890', 'ascii');

  it('accepts the exact current code', () => {
    expect(verifyTotp(rfcSeed, '287082', 59)).toBe(true);
  });

  it('rejects an incorrect code', () => {
    expect(verifyTotp(rfcSeed, '000000', 59)).toBe(false);
  });

  it('tolerates clock drift within the window (one step before/after)', () => {
    const nextStepCode = computeTotp(rfcSeed, 59 + 30);
    expect(verifyTotp(rfcSeed, nextStepCode, 59, 1)).toBe(true);
  });

  it('rejects a code beyond the drift window', () => {
    const farCode = computeTotp(rfcSeed, 59 + 300);
    expect(verifyTotp(rfcSeed, farCode, 59, 1)).toBe(false);
  });

  it('rejects malformed input without throwing', () => {
    expect(verifyTotp(rfcSeed, 'abcdef', 59)).toBe(false);
    expect(verifyTotp(rfcSeed, '12345', 59)).toBe(false);
    expect(verifyTotp(rfcSeed, '', 59)).toBe(false);
  });
});

describe('generateTotpSecret', () => {
  it('generates a fresh 20-byte secret with a matching base32 encoding round-trip', () => {
    const { secret, base32 } = generateTotpSecret();
    expect(secret).toHaveLength(20);
    expect(typeof base32).toBe('string');
    expect(base32.length).toBeGreaterThan(0);

    // Un código calculado sobre el secreto crudo debe verificar correctamente contra sí mismo.
    const code = computeTotp(secret, Date.now() / 1_000);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('never repeats a secret across calls', () => {
    const first = generateTotpSecret();
    const second = generateTotpSecret();
    expect(first.secret.equals(second.secret)).toBe(false);
  });
});
