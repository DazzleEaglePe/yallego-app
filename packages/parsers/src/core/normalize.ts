import type { ParserRules } from './parser.port.js';

/**
 * Convierte un monto de texto peruano ("1,250.50", "35.50", "35") a número.
 * Devuelve `null` si el texto no es un monto válido, en vez de lanzar: un
 * parser nunca debe reventar por una notificación con formato inesperado.
 */
export function parseAmount(rawAmount: string): number | null {
  const cleaned = rawAmount.trim().replaceAll(',', '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * 100) / 100;
}

/** Colapsa espacios repetidos y recorta; conserva tildes y caracteres especiales del nombre. */
export function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function compilePattern(rules: ParserRules): RegExp {
  return new RegExp(rules.pattern, rules.flags ?? '');
}
