import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { ApiKeyScope } from '@yallego/contracts';
import type { MembershipRole } from '@prisma/client';

export const REQUIRE_ACCESS_KEY = 'yallego:require-access';

export interface AccessRequirement {
  /** Rol mínimo cuando la credencial es la sesión del panel. */
  role: MembershipRole;
  /** Alcance requerido cuando la credencial es una API key. */
  scope: ApiKeyScope;
}

export const RequireAccess = (requirement: AccessRequirement): CustomDecorator<string> =>
  SetMetadata(REQUIRE_ACCESS_KEY, requirement);
