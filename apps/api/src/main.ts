import 'reflect-metadata';
import './bootstrap/tracing';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Redis } from 'ioredis';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-application';
import { RedisIoAdapter } from './bootstrap/redis-io-adapter';
import { initSentry } from './bootstrap/sentry';
import type { Environment } from './config/env.schema';
import { REDIS_CLIENT } from './infrastructure/cache/redis.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get<ConfigService<Environment, true>>(ConfigService);

  initSentry(config);
  app.useLogger(app.get(Logger));

  configureApplication(
    app,
    config.get('DASHBOARD_URL', { infer: true }),
    config.get('CORS_ALLOWED_ORIGINS', { infer: true }),
  );

  const redisIoAdapter = new RedisIoAdapter(app, app.get<Redis>(REDIS_CLIENT));
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

void bootstrap();
