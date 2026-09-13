import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { DeviceAuthenticatedRequest, DeviceContext } from '../guards/device-token.guard';

export const CurrentDevice = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DeviceContext =>
    context.switchToHttp().getRequest<DeviceAuthenticatedRequest>().device,
);
