import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TokenService } from '../auth/token.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';

export interface PlatformAdminContext {
  id: string;
  email: string;
  fullName: string;
}

export interface PlatformAuthenticatedRequest extends Request {
  platformAdmin: PlatformAdminContext;
}

/** Sesión de administrador de plataforma — completamente independiente de `AccessTokenGuard` (docs/07 §11: "sin relación con las cuentas de tenant"). */
@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlatformAuthenticatedRequest>();
    const authorization = request.header('authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'Falta la credencial de administrador.',
      );
    }

    const payload = this.tokenService.verifyPlatformAccessToken(token);

    const admin = await this.prisma.platformAdmin.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'La cuenta de administrador ya no está activa.',
      );
    }

    request.platformAdmin = { id: admin.id, email: admin.email, fullName: admin.fullName };
    return true;
  }
}
