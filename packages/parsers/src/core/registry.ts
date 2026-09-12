import type { Parser, RawNotification } from './parser.port.js';

/** Selecciona el parser adecuado por `packageName`; no asume ningún orden particular. */
export class ParserRegistry {
  private readonly parsers: readonly Parser[];

  constructor(parsers: readonly Parser[]) {
    this.parsers = parsers;
  }

  select(raw: RawNotification): Parser | null {
    return this.parsers.find((parser) => parser.supports(raw)) ?? null;
  }

  byWalletCode(walletCode: string): Parser | null {
    return this.parsers.find((parser) => parser.walletCode === walletCode) ?? null;
  }
}
