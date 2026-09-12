import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { appConfig } from './config/app.config';
import { validateEnvironment } from './config/env.schema';
import { RedisModule } from './infrastructure/cache/redis.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { ObservabilityLoggerModule } from './infrastructure/observability/logger.module';
import { MetricsModule } from './infrastructure/observability/metrics.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { HealthModule } from './modules/health/health.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { MembersModule } from './modules/members/members.module';
import { ObservabilityAlertsModule } from './modules/observability/observability-alerts.module';
import { ParsingModule } from './modules/parsing/parsing.module';
import { PlansModule } from './modules/plans/plans.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { PlatformAuthModule } from './modules/platform-auth/platform-auth.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { LogContextInterceptor } from './shared/interceptors/log-context.interceptor';
import { MetricsInterceptor } from './shared/interceptors/metrics.interceptor';
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
    ObservabilityLoggerModule,
    MetricsModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'default', limit: 60, ttl: 60_000 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuthModule,
    AuditModule,
    HealthModule,
    MembersModule,
    WalletsModule,
    DevicesModule,
    IngestModule,
    ParsingModule,
    PlansModule,
    ApiKeysModule,
    TransactionsModule,
    RealtimeModule,
    WebhooksModule,
    PlatformAuthModule,
    PlatformAdminModule,
    ObservabilityAlertsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LogContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('{*splat}');
  }
}
