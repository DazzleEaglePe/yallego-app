import { describe, expect, it } from 'vitest';

import { base32Decode, base32Encode } from './base32';

describe('base32Encode / base32Decode', () => {
  // RFC 4648 §10 vectores de prueba oficiales.
  const vectors: Array<[string, string]> = [
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ];

  it.each(vectors)('encodes %j as %s', (input, expected) => {
    expect(base32Encode(Buffer.from(input, 'ascii'))).toBe(expected);
  });

  it.each(vectors)('decodes %s back to %j', (input, encoded) => {
    expect(base32Decode(encoded).toString('ascii')).toBe(input);
  });

  it('round-trips arbitrary binary secrets', () => {
    const secret = Buffer.from([0, 1, 2, 253, 254, 255, 128, 64, 32, 16]);
    expect(base32Decode(base32Encode(secret))).toEqual(secret);
  });
});
