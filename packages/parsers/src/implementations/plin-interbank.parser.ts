import { RegexParser } from '../core/regex-parser.js';
import type { ParserRules } from '../core/parser.port.js';

/** ⚠️ PENDIENTE DE VERIFICAR — ver el comentario en `plin-bbva.parser.ts`. */
export const PLIN_INTERBANK_DEFAULT_PATTERNS: ParserRules[] = [
  {
    pattern: '^Te llegó un Plin de (?<sender>.+?) por S/\\s*(?<amount>[\\d,]+\\.\\d{2})\\.?\\s*$',
    flags: 'i',
  },
];

export class PlinInterbankParser extends RegexParser {
  readonly walletCode = 'PLIN_INTERBANK';
  protected readonly packageNames = ['pe.com.interbank.mobilebanking'] as const;
}
