import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { computeSignature, verifySignature } from './webhook-signature';

describe('computeSignature', () => {
  it('matches the formula in docs/06_API_CONTRACT.md §9.2 exactly', () => {
    const secret = 'whsec_test';
    const timestamp = 1_747_250_400;
    const rawBody = '{"id":"evt_1"}';

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    expect(computeSignature(secret, timestamp, rawBody)).toBe(expected);
  });
});

describe('verifySignature', () => {
  const secret = 'whsec_test';
  const timestamp = 1_747_250_400;
  const rawBody = '{"id":"evt_1"}';

  it('accepts a signature computed with the same secret, timestamp and body', () => {
    const signature = computeSignature(secret, timestamp, rawBody);
    expect(verifySignature(secret, timestamp, rawBody, signature)).toBe(true);
  });

  it('rejects a signature computed with a different secret', () => {
    const signature = computeSignature('whsec_other', timestamp, rawBody);
    expect(verifySignature(secret, timestamp, rawBody, signature)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const signature = computeSignature(secret, timestamp, rawBody);
    expect(verifySignature(secret, timestamp, '{"id":"evt_2"}', signature)).toBe(false);
  });

  it('rejects a malformed signature without throwing (length mismatch would crash timingSafeEqual)', () => {
    expect(verifySignature(secret, timestamp, rawBody, 'not-hex')).toBe(false);
    expect(verifySignature(secret, timestamp, rawBody, '')).toBe(false);
  });
});
