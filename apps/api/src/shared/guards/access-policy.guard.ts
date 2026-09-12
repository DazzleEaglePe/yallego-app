import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { satisfiesRole } from '@yallego/contracts';

import { ApiHttpException } from '../errors/api-http.exception';
import { REQUIRE_ACCESS_KEY, type AccessRequirement } from '../decorators/require-access.decorator';
import type { PublicApiRequest } from './public-api-auth.guard';

/**
 * El equivalente de `RolesGuard` para rutas de doble credencial: evalúa rol
 * (sesión de panel) o alcance (API key) según cuál haya resuelto
 * `PublicApiAuthGuard`, para que un mismo endpoint tenga una sola regla de
 * autorización declarada, no dos.
 */
@Injectable()
export class AccessPolicyGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<AccessRequirement | undefined>(
      REQUIRE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) return true;

    const request = context.switchToHttp().getRequest<PublicApiRequest>();
    const access = request.access;

    const allowed =
      access.type === 'user'
        ? satisfiesRole(access.role, requirement.role)
        : access.scopes.includes(requirement.scope);

    if (!allowed) {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        access.type === 'api_key'
          ? `Esta clave no tiene el alcance "${requirement.scope}".`
          : 'No tienes permiso para realizar esta acción.',
      );
    }

    return true;
  }
}
