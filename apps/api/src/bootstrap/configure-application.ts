import { RequestMethod, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { ApiExceptionFilter } from '../shared/filters/api-exception.filter';

export function configureApplication(
  app: INestApplication,
  dashboardUrl: string,
  additionalCorsOrigins: string[] = [],
): void {
  // docs/06_API_CONTRACT.md §1.1 define superficies con base propia:
  // `/v1` (pública y panel), `/internal/v1` (dispositivos) y `/platform/v1`
  // (administración). El prefijo global cubre la primera; las demás declaran
  // su ruta completa y se excluyen aquí para no terminar en `/v1/internal/v1/...`.
  app.setGlobalPrefix('v1', {
    exclude: [
      { path: 'internal/v1/{*splat}', method: RequestMethod.ALL },
      { path: 'platform/v1/{*splat}', method: RequestMethod.ALL },
      // Convención de scraping de Prometheus: se sirve en la raíz, no
      // versionado — no es parte del contrato de la API pública.
      { path: 'metrics', method: RequestMethod.GET },
    ],
  });
  app.use(cookieParser());
  app.use(helmet());
  app.enableCors({
    credentials: true,
    origin: [...new Set([dashboardUrl, ...additionalCorsOrigins])],
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
