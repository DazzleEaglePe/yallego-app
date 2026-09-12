import { randomInt } from 'node:crypto';

// Excluye caracteres ambiguos (0/O, 1/I) para que el código sea legible al dictarlo.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Genera un código de vinculación con formato `XXXX-XXXX`, como en la UI del panel. */
export function generatePairingCode(): string {
  let raw = '';
  for (let i = 0; i < 8; i += 1) {
    raw += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Normaliza un código recibido del dispositivo antes de hashearlo o compararlo. */
export function canonicalizePairingCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, '').toUpperCase();
}
