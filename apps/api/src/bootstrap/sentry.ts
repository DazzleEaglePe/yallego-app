import type { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';

import type { Environment } from '../config/env.schema';

/**
 * RNF-OBS-007: errores no controlados reportados a un servicio de
 * seguimiento de errores. Sin `SENTRY_DSN` configurado (no hay cuenta real
 * todavía), esta función no hace nada — `Sentry.captureException` en
 * `ApiExceptionFilter` y los manejadores de abajo quedan como no-op seguro
 * hasta que se configure un DSN real.
 *
 * `skipOpenTelemetrySetup: true` porque `tracing.ts` ya registra su propio
 * `NodeSDK` (RNF-OBS-003) — dejar que Sentry registre OTel por su cuenta
 * competiría por el `TracerProvider` global. Sentry aquí solo captura
 * errores, no genera trazas.
 */
export function initSentry(config: ConfigService<Environment, true>): void {
  const dsn = config.get('SENTRY_DSN', { infer: true });
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: config.get('NODE_ENV', { infer: true }),
    skipOpenTelemetrySetup: true,
    tracesSampleRate: 0,
  });

  process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
  });
  process.on('unhandledRejection', (reason) => {
    Sentry.captureException(reason);
  });
}
