/**
 * Contrato del núcleo de parsing (docs/04_ARQUITECTURA_SOFTWARE.md §4.1).
 * Sin dependencias externas: se prueba con muestras reales sin infraestructura.
 */

export interface RawNotification {
  packageName: string;
  title: string | null;
  text: string | null;
  postedAt: Date;
}

export interface Money {
  /** Siempre con 2 decimales exactos, ej. 35.5 → "35.50" en `toFixedString()`. */
  value: number;
  currency: string;
}

export interface NormalizedTransaction {
  walletCode: string;
  senderName: string | null;
  amount: Money;
  securityCode: string | null;
  approvalCode: string | null;
  occurredAt: Date;
}

/**
 * Reglas de un parser en base de datos (`ParserPattern.rules`), no en código
 * compilado (RF-WAL-005): permite corregir un formato sin redespliegue.
 */
export interface ParserRules {
  /** Expresión regular con grupos nombrados `amount`, `sender?`, `securityCode?`, `approvalCode?`. */
  pattern: string;
  /** Flags de la expresión regular, ej. "i". */
  flags?: string;
  /** Si además de `text` debe intentarse sobre `title` cuando `text` no coincide. */
  matchTitle?: boolean;
}

export interface Parser {
  readonly walletCode: string;
  supports(raw: RawNotification): boolean;
  parse(raw: RawNotification): NormalizedTransaction | null;
}

/** Puerto de salida: de dónde vienen los patrones activos de una billetera. */
export interface ParserPatternRepository {
  findActivePatterns(walletCode: string): Promise<ParserRules[] | null>;
}
