import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { PublicApiRequest } from '../guards/public-api-auth.guard';
import type { TenantResourceContext } from '../guards/tenant.guard';

export const CurrentPublicTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantResourceContext =>
    context.switchToHttp().getRequest<PublicApiRequest>().tenant,
);
