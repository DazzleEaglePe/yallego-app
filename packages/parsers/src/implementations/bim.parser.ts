import { RegexParser } from '../core/regex-parser.js';
import type { ParserRules } from '../core/parser.port.js';

/** ⚠️ PENDIENTE DE VERIFICAR — ver el comentario en `plin-bbva.parser.ts`. */
export const BIM_DEFAULT_PATTERNS: ParserRules[] = [
  {
    pattern: '^Recibiste S/\\s*(?<amount>[\\d,]+\\.\\d{2}) de (?<sender>.+?) en tu BIM\\.?\\s*$',
    flags: 'i',
  },
];

export class BimParser extends RegexParser {
  readonly walletCode = 'BIM';
  protected readonly packageNames = ['com.pdp.bim', 'pe.pagoefectivo.bim'] as const;
}
