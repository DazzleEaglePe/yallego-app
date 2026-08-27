import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AccessTokenPayload } from '../../modules/auth/auth.types';
import type { AuthenticatedRequest } from '../guards/access-token.guard';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPayload =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
