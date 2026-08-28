import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';

import { MetricsService } from '../../infrastructure/observability/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const start = process.hrtime.bigint();

    const record = (): void => {
      // `route.path` es el patrón registrado (p. ej. `/transactions/:id`), no
      // la URL real — evita cardinalidad sin límite por cada id distinto.
      const route = request.route?.path ? `${request.baseUrl}${request.route.path}` : request.path;
      const labels = { method: request.method, route, status_code: String(response.statusCode) };
      this.metrics.httpRequestsTotal.inc(labels);
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.httpRequestDurationSeconds.observe(labels, durationSeconds);
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
