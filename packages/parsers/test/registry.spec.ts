import { describe, expect, it } from 'vitest';

import {
  ParserRegistry,
  YapeParser,
  YAPE_DEFAULT_PATTERNS,
  PlinBbvaParser,
  PLIN_BBVA_DEFAULT_PATTERNS,
} from '../src/index.js';

describe('ParserRegistry', () => {
  const yape = new YapeParser(YAPE_DEFAULT_PATTERNS);
  const plinBbva = new PlinBbvaParser(PLIN_BBVA_DEFAULT_PATTERNS);
  const registry = new ParserRegistry([yape, plinBbva]);

  it('selects the parser matching the package name', () => {
    const selected = registry.select({
      packageName: 'com.bcp.innovacxion.yapeapp',
      title: null,
      text: null,
      postedAt: new Date(),
    });
    expect(selected).toBe(yape);
  });

  it('returns null when no parser supports the package', () => {
    const selected = registry.select({
      packageName: 'com.unknown.wallet',
      title: null,
      text: null,
      postedAt: new Date(),
    });
    expect(selected).toBeNull();
  });

  it('finds a parser by wallet code', () => {
    expect(registry.byWalletCode('PLIN_BBVA')).toBe(plinBbva);
    expect(registry.byWalletCode('UNKNOWN')).toBeNull();
  });
});
