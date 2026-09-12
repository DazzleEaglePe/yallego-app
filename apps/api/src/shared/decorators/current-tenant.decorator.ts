import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { TenantContext, TenantScopedRequest } from '../guards/tenant.guard';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext =>
    context.switchToHttp().getRequest<TenantScopedRequest>().tenant,
);
