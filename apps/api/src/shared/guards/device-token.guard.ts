import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { DeviceStatus, TenantStatus } from '@prisma/client';
import type { Request } from 'express';

import { TokenService } from '../../modules/auth/token.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../errors/api-http.exception';

export interface DeviceContext {
  id: string;
  tenantId: string;
  status: DeviceStatus;
}

export interface DeviceAuthenticatedRequest extends Request {
  device: DeviceContext;
}

/**
 * Autentica al dispositivo Android por su token permanente (`docs/07_SEGURIDAD_AUTH.md`
 * §4). El token no tiene estructura JWT: es opaco, y el servidor solo guarda su hash.
 * Privilegio mínimo: solo abre las rutas de `/internal/v1`, nunca datos del negocio.
 */
@Injectable()
export class DeviceTokenGuard implements CanActivate {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<DeviceAuthenticatedRequest>();
    const authorization = request.header('authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'El dispositivo no está autenticado.',
      );
    }

    const tokenHash = this.tokenService.hashOpaqueToken(token);
    const device = await this.prisma.withoutTenantScope((tx) =>
      tx.device.findUnique({ where: { tokenHash }, include: { tenant: true } }),
    );

    if (
      !device ||
      device.status === DeviceStatus.REVOKED ||
      device.tenant.status !== TenantStatus.ACTIVE
    ) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'El dispositivo no está autenticado.',
      );
    }

    request.device = { id: device.id, tenantId: device.tenantId, status: device.status };
    return true;
  }
}
