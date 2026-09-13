import { describe, expect, it } from 'vitest';

import { YapeParser } from '../src/index.js';

describe('RegexParser error handling', () => {
  it('skips a malformed stored pattern instead of throwing', () => {
    const parser = new YapeParser([
      { pattern: '(unterminated group' },
      { pattern: '^Te Yapearon S/\\s*(?<amount>[\\d,]+\\.\\d{2}) de (?<sender>.+?)\\.?\\s*$' },
    ]);

    const result = parser.parse({
      packageName: 'com.bcp.innovacxion.yapeapp',
      title: null,
      text: 'Te Yapearon S/ 10.00 de ANA TORRES',
      postedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(result?.amount.value).toBe(10);
  });

  it('falls back to the title when matchTitle is set and the body does not match', () => {
    const parser = new YapeParser([
      {
        pattern: '^Te Yapearon S/\\s*(?<amount>[\\d,]+\\.\\d{2})$',
        matchTitle: true,
      },
    ]);

    const result = parser.parse({
      packageName: 'com.bcp.innovacxion.yapeapp',
      title: 'Te Yapearon S/ 15.00',
      text: 'Toca para ver el detalle',
      postedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(result?.amount.value).toBe(15);
  });

  it('returns null when the amount group is missing entirely', () => {
    const parser = new YapeParser([{ pattern: '^Te Yapearon a (?<sender>.+)$' }]);

    const result = parser.parse({
      packageName: 'com.bcp.innovacxion.yapeapp',
      title: null,
      text: 'Te Yapearon a JUAN',
      postedAt: new Date(),
    });

    expect(result).toBeNull();
  });
});
