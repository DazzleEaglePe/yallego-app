import { describe, expect, it } from 'vitest';

import { compilePattern, normalizeText, parseAmount } from '../src/index.js';

describe('parseAmount', () => {
  it('parses plain amounts, with or without decimals', () => {
    expect(parseAmount('35.50')).toBe(35.5);
    expect(parseAmount('20')).toBe(20);
  });

  it('strips thousands separators', () => {
    expect(parseAmount('1,250.00')).toBe(1250);
    expect(parseAmount('12,345.67')).toBe(12345.67);
  });

  it('rejects non-numeric or non-positive input', () => {
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-10.00')).toBeNull();
    expect(parseAmount('0.00')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});

describe('normalizeText', () => {
  it('collapses repeated whitespace and trims', () => {
    expect(normalizeText('  JUAN   PEREZ  ')).toBe('JUAN PEREZ');
  });
});

describe('compilePattern', () => {
  it('builds a RegExp from stored rules', () => {
    const regex = compilePattern({ pattern: '^(?<amount>\\d+)$', flags: 'i' });
    expect(regex.test('123')).toBe(true);
  });
});
