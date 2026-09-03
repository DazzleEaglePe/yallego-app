import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MembershipRole } from '@prisma/client';
import { satisfiesRole } from '@yallego/contracts';

import { ApiHttpException } from '../errors/api-http.exception';
import { REQUIRED_ROLE_KEY } from '../decorators/require-role.decorator';
import type { TenantScopedRequest } from './tenant.guard';

/** Aplica la matriz de permisos de `docs/07_SEGURIDAD_AUTH.md` §5.2 por jerarquía de rol. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MembershipRole | undefined>(
      REQUIRED_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const role = request.tenant?.role;

    if (!role || !satisfiesRole(role, required)) {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'No tienes permiso para realizar esta acción.',
      );
    }

    return true;
  }
}
