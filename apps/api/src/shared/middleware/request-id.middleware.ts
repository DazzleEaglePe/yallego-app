import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incomingRequestId = request.header(REQUEST_ID_HEADER);
    const requestId = incomingRequestId?.trim() || randomUUID();

    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    next();
  }
}
