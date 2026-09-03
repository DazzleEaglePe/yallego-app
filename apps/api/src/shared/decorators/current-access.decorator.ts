import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AccessContext, PublicApiRequest } from '../guards/public-api-auth.guard';

export const CurrentAccess = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessContext =>
    context.switchToHttp().getRequest<PublicApiRequest>().access,
);
