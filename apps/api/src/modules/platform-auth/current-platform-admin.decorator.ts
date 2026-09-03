import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { PlatformAdminContext, PlatformAuthenticatedRequest } from './platform-auth.guard';

export const CurrentPlatformAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlatformAdminContext =>
    context.switchToHttp().getRequest<PlatformAuthenticatedRequest>().platformAdmin,
);
