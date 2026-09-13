import { UseGuards, applyDecorators } from '@nestjs/common';
import type { MembershipRole } from '@prisma/client';

import { AccessTokenGuard } from '../guards/access-token.guard';
import { RolesGuard } from '../guards/roles.guard';
import { TenantGuard } from '../guards/tenant.guard';
import { RequireRole } from './require-role.decorator';

/**
 * Autentica, resuelve el tenant activo y verifica el rol mínimo.
 * El orden importa: cada guard consume lo que dejó el anterior en la solicitud.
 */
export function TenantScoped(role?: MembershipRole): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(AccessTokenGuard, TenantGuard, RolesGuard),
    ...(role ? [RequireRole(role)] : []),
  );
}
