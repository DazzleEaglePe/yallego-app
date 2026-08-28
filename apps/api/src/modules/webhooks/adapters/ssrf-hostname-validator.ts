import { lookup } from 'node:dns/promises';

import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiHttpException } from '../../../shared/errors/api-http.exception';
import { isPrivateOrReservedIp } from '../domain/ssrf-guard';

/**
 * Resuelve el hostname y rechaza si CUALQUIER dirección resuelta es privada o
 * reservada — no alcanza con mirar el string de la URL: un dominio público
 * puede resolver a una IP interna (DNS rebinding). El worker de entrega repite
 * esta misma verificación en cada envío, no solo al registrar el endpoint,
 * por la misma razón.
 */
@Injectable()
export class SsrfHostnameValidator {
  async assertPublicHostname(url: string): Promise<void> {
    const hostname = new URL(url).hostname;

    let addresses: Array<{ address: string }>;
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'No se pudo resolver el dominio del webhook.',
      );
    }

    if (addresses.length === 0 || addresses.some((entry) => isPrivateOrReservedIp(entry.address))) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'La URL del webhook no puede apuntar a una red interna.',
      );
    }
  }
}
