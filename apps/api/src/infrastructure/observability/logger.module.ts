import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import type { Environment } from '../../config/env.schema';
import { REQUEST_ID_HEADER } from '../../shared/middleware/request-id.middleware';

/** Conserva la ruta útil para observabilidad sin registrar valores de filtros o búsquedas. */
export function safeRequestPath(url: string | undefined): string | undefined {
  return url?.split('?', 1)[0];
}

/**
 * RNF-OBS-001: registros estructurados en JSON con identificador de
 * correlación, tenant y actor. `pino-http` es el único generador del id de
 * correlación (`request.id`) — `RequestIdMiddleware` lo refleja en la
 * respuesta y `ApiExceptionFilter` lo usa en el sobre de error, en vez de
 * mantener dos generadores independientes que podrían divergir.
 *
 * `tenant`/`actor` no se conocen todavía en este punto (se resuelven recién
 * en los guards, más adelante en el pipeline) — se agregan a la línea de
 * log final vía `req.logContext`, que cualquier guard puede rellenar
 * (`AttachLogContext`, ver `shared/observability/log-context.ts`).
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => {
        const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            genReqId: (req: IncomingMessage) => {
              const incoming = req.headers[REQUEST_ID_HEADER];
              const value = Array.isArray(incoming) ? incoming[0] : incoming;
              return value?.trim() || randomUUID();
            },
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTADO]',
            },
            autoLogging: {
              ignore: (req: IncomingMessage) => req.url === '/health' || req.url === '/metrics',
            },
            customProps: (req: IncomingMessage & { logContext?: Record<string, unknown> }) => ({
              ...req.logContext,
            }),
            transport: isProduction
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
            serializers: {
              req: (req: IncomingMessage & { id?: unknown }) => ({
                id: req.id,
                method: (req as { method?: string }).method,
                url: safeRequestPath(req.url),
              }),
              res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
            },
          },
        };
      },
    }),
  ],
  exports: [LoggerModule],
})
export class ObservabilityLoggerModule {}
