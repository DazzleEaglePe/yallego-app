import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { appConfig } from './config/app.config';
import { validateEnvironment } from './config/env.schema';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { RequestIdMiddleware } from './shared/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: false,
      isGlobal: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ name: 'default', limit: 60, ttl: 60_000 }]),
    DatabaseModule,
    AuthModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*splat}');
  }
}
