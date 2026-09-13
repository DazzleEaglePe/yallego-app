import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import type { Environment } from '../../config/env.schema';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { isIpAllowed } from './ip-allowlist';

/**
 * docs/07_SEGURIDAD_AUTH.md §11. Corre ANTES que cualquier verificación de
 * credencial en toda `/platform/v1`, login incluido: una IP no autorizada no
 * debe ni poder intentar autenticarse. Sin `PLATFORM_ALLOWED_IPS` configurada,
 * bloquea todo — es la superficie de mayor privilegio, el valor por omisión
 * es cerrado, no abierto.
 */
@Injectable()
export class PlatformIpAllowlistGuard implements CanActivate {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allowlistRaw = this.config.get('PLATFORM_ALLOWED_IPS', { infer: true });
    const allowlist = allowlistRaw ? allowlistRaw.split(',') : [];

    if (!isIpAllowed(request.ip ?? '', allowlist)) {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Acceso no permitido desde esta dirección.',
      );
    }

    return true;
  }
}
