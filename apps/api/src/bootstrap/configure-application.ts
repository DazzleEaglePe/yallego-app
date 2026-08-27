import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { ApiExceptionFilter } from '../shared/filters/api-exception.filter';

export function configureApplication(app: INestApplication, dashboardUrl: string): void {
  app.setGlobalPrefix('v1');
  app.use(cookieParser());
  app.use(helmet());
  app.enableCors({
    credentials: true,
    origin: dashboardUrl,
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
