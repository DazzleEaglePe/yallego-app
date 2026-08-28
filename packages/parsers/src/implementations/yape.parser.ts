import { RegexParser } from '../core/regex-parser.js';
import type { ParserRules } from '../core/parser.port.js';

/**
 * Formatos verificados contra la documentación y una captura real anonimizada.
 * Yape mantiene variantes distintas según la versión de la aplicación, por eso
 * las reglas se conservan separadas y se prueban con fixtures de regresión.
 */
export const YAPE_DEFAULT_PATTERNS: ParserRules[] = [
  {
    pattern:
      '^Yape!\\s+(?<sender>.+?)\\s+te envió un pago por S/\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?)\\.?\\s*$',
    flags: 'i',
  },
  {
    pattern:
      '^Te Yapearon S/\\s*(?<amount>[\\d,]+(?:\\.\\d{1,2})?) de (?<sender>.+?)(?:\\s*Código de seguridad:\\s*(?<securityCode>\\d+))?\\.?\\s*$',
    flags: 'i',
  },
];

export class YapeParser extends RegexParser {
  readonly walletCode = 'YAPE';
  protected readonly packageNames = ['com.bcp.innovacxion.yapeapp'] as const;
}
