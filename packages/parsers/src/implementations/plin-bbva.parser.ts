import { RegexParser } from '../core/regex-parser.js';
import type { ParserRules } from '../core/parser.port.js';

/**
 * ⚠️ PENDIENTE DE VERIFICAR: no hay muestra real de esta billetera todavía
 * (docs/10_PLAN_DESARROLLO.md, Sprint 4, "Recolectar muestras reales"). Este
 * patrón es una inferencia razonable, no un formato confirmado. Corregir
 * mediante una nueva versión de parser (sin redespliegue) en cuanto se
 * recolecte una notificación real.
 */
export const PLIN_BBVA_DEFAULT_PATTERNS: ParserRules[] = [
  {
    pattern: '^Recibiste S/\\s*(?<amount>[\\d,]+\\.\\d{2}) por Plin de (?<sender>.+?)\\.?\\s*$',
    flags: 'i',
  },
];

export class PlinBbvaParser extends RegexParser {
  readonly walletCode = 'PLIN_BBVA';
  protected readonly packageNames = ['com.bbva.nxtapp'] as const;
}
