import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * El middleware de `pino-http` (registrado antes que este, ver
 * `observability.module.ts`) ya honra `X-Request-Id` entrante o genera uno
 * en `request.id` — es el que también queda en cada línea de log (RNF-OBS-001).
 * Este middleware solo lo refleja en `response.locals` (lo que consume
 * `ApiExceptionFilter`) y en la cabecera de respuesta, para no mantener dos
 * generadores de id independientes que podrían divergir.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = typeof request.id === 'string' && request.id ? request.id : randomUUID();

    response.locals.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);
    next();
  }
}
