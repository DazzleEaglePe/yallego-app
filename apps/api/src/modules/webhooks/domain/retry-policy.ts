/**
 * docs/04_ARQUITECTURA_SOFTWARE.md §5.2. Espera ACUMULADA por intento, no
 * incremental — BullMQ pide el delay hasta el PRÓXIMO intento, así que se
 * expresa como diferencia entre entradas consecutivas de la tabla.
 */
const CUMULATIVE_DELAYS_MS = [
  0, // intento 1: inmediato
  1_000, // intento 2: 1 s
  6_000, // intento 3: 6 s
  36_000, // intento 4: 36 s
  5 * 60_000, // intento 5: 5 min
  35 * 60_000, // intento 6: 35 min
  150 * 60_000, // intento 7: 2 h 30 min
  12 * 60 * 60_000, // intento 8: 12 h
];

export const MAX_DELIVERY_ATTEMPTS = CUMULATIVE_DELAYS_MS.length;

/** `attemptNumber` es 1-based: el intento que ya se hizo. Devuelve el delay hasta el siguiente, o null si no hay más. */
export function delayBeforeNextAttempt(attemptNumber: number): number | null {
  if (attemptNumber < 1 || attemptNumber >= MAX_DELIVERY_ATTEMPTS) return null;
  const current = CUMULATIVE_DELAYS_MS[attemptNumber];
  const previous = CUMULATIVE_DELAYS_MS[attemptNumber - 1];
  if (current === undefined || previous === undefined) return null;
  return current - previous;
}
