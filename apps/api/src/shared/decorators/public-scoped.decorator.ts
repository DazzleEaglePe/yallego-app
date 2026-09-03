import { UseGuards, applyDecorators } from '@nestjs/common';

import { AccessPolicyGuard } from '../guards/access-policy.guard';
import { ApiKeyRateLimitGuard } from '../guards/api-key-rate-limit.guard';
import { PublicApiAuthGuard } from '../guards/public-api-auth.guard';
import { RequireAccess, type AccessRequirement } from './require-access.decorator';

/** Como `TenantScoped`, pero acepta sesión de panel o clave de API (docs/06_API_CONTRACT.md §1.1), con rate limiting por clave (§1.2, §15). */
export function PublicScoped(requirement: AccessRequirement): MethodDecorator & ClassDecorator {
  return applyDecorators(
    UseGuards(PublicApiAuthGuard, ApiKeyRateLimitGuard, AccessPolicyGuard),
    RequireAccess(requirement),
  );
}
