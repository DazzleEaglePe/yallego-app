import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from '../../config/env.schema';
import { ApiHttpException } from '../../shared/errors/api-http.exception';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Cifrado simétrico genérico con AES-256-GCM y `ENCRYPTION_KEY`. Formato
 * almacenado: `iv(12) || authTag(16) || ciphertext`.
 *
 * Dos usos hoy: el nombre del remitente (docs/07_SEGURIDAD_AUTH.md §7.2 —
 * pertenece a un tercero que nunca dio consentimiento directo) y el secreto
 * de firma de cada webhook (docs/07_SEGURIDAD_AUTH.md §7.1, dato crítico).
 * `buildSearchColumn` es específico del primer caso; el resto es genérico.
 */
@Injectable()
export class EncryptionService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {}

  encrypt(plainText: string): Uint8Array<ArrayBuffer> {
    const key = this.getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    // `Buffer` tipa su respaldo como `ArrayBufferLike` (incluye `SharedArrayBuffer`);
    // Prisma exige `Uint8Array<ArrayBuffer>` para columnas `Bytes`. En este punto el
    // buffer siempre es un `ArrayBuffer` propio y recién asignado — la aserción
    // documenta esa garantía, no la fuerza.
    return Uint8Array.from(
      Buffer.concat([iv, cipher.getAuthTag(), ciphertext]),
    ) as Uint8Array<ArrayBuffer>;
  }

  decrypt(stored: Uint8Array): string {
    const key = this.getKey();
    const iv = stored.subarray(0, IV_LENGTH);
    const authTag = stored.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = stored.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Normalizada para el índice de búsqueda; nunca es la fuente de verdad del dato. */
  buildSearchColumn(plainText: string): string {
    return plainText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim()
      .slice(0, 200);
  }

  private getKey(): Buffer {
    const configured = this.config.get('ENCRYPTION_KEY', { infer: true });
    if (!configured) {
      throw new ApiHttpException(
        503,
        'SERVICE_UNAVAILABLE',
        'El cifrado de datos sensibles no está configurado.',
      );
    }

    const key = Buffer.from(configured, 'base64');
    if (key.length !== 32) {
      throw new ApiHttpException(
        503,
        'SERVICE_UNAVAILABLE',
        'La clave de cifrado configurada no tiene la longitud esperada.',
      );
    }
    return key;
  }
}
