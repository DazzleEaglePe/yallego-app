import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../infrastructure/cache/redis.module';
import { UsageCounterService } from '../../modules/plans/usage-counter.service';
import { ApiHttpException } from '../errors/api-http.exception';
import type { PublicApiRequest } from './public-api-auth.guard';

const WINDOW_SECONDS = 60;

/**
 * RF-API-010/011 (docs/06_API_CONTRACT.md §1.2 y §15): límite por clave de
 * API según `plan.limits.rate_limit_per_minute`, ventana fija de 1 minuto por
 * clave. Solo aplica a credenciales de API key — la sesión del panel ya pasa
 * por `ThrottlerModule` (límite global, no por plan). Debe ir DESPUÉS de
 * `PublicApiAuthGuard` en la cadena de guards: depende de `request.access`.
 */
@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(UsageCounterService) private readonly usageCounter: UsageCounterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PublicApiRequest>();
    if (request.access.type !== 'api_key') return true;

    const response = context.switchToHttp().getResponse<Response>();
    const { apiKeyId, rateLimitPerMinute } = request.access;

    const nowSeconds = Math.floor(Date.now() / 1_000);
    const windowStart = nowSeconds - (nowSeconds % WINDOW_SECONDS);
    const resetAt = windowStart + WINDOW_SECONDS;
    const key = `ratelimit:api-key:${apiKeyId}:${windowStart}`;

    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, WINDOW_SECONDS);

    const remaining = Math.max(0, rateLimitPerMinute - count);
    response.setHeader('X-RateLimit-Limit', String(rateLimitPerMinute));
    response.setHeader('X-RateLimit-Remaining', String(remaining));
    response.setHeader('X-RateLimit-Reset', String(resetAt));

    if (rateLimitPerMinute <= 0 || count > rateLimitPerMinute) {
      const retryAfter = Math.max(1, resetAt - nowSeconds);
      response.setHeader('Retry-After', String(retryAfter));
      throw new ApiHttpException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT_EXCEEDED',
        'Se superó el límite de solicitudes.',
        {
          limit: rateLimitPerMinute,
          window_seconds: WINDOW_SECONDS,
          retry_after: retryAfter,
        },
      );
    }

    // No bloquea la respuesta: es un contador informativo (RF-TXN-016 usa el
    // de transacciones, no este), no una condición de aceptar o no la solicitud.
    this.usageCounter.incrementApiCalls(request.tenant.id).catch(() => {});

    return true;
  }
}
