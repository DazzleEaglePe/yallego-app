import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { MembershipRole } from '@prisma/client';

export const REQUIRED_ROLE_KEY = 'yallego:required-role';

/** Declara el rol mínimo que exige el endpoint. Se evalúa por jerarquía. */
export const RequireRole = (role: MembershipRole): CustomDecorator<string> =>
  SetMetadata(REQUIRED_ROLE_KEY, role);
