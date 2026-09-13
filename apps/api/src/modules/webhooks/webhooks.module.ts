import { Module } from '@nestjs/common';

import { CryptoModule } from '../../infrastructure/crypto/crypto.module';
import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { AccessPolicyGuard } from '../../shared/guards/access-policy.guard';
import { ApiKeyRateLimitGuard } from '../../shared/guards/api-key-rate-limit.guard';
import { PublicApiAuthGuard } from '../../shared/guards/public-api-auth.guard';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SsrfHostnameValidator } from './adapters/ssrf-hostname-validator';
import { HttpWebhookDispatcher } from './adapters/http-webhook-dispatcher';
import { WebhookDeliveryWorker } from './adapters/webhook-delivery.worker';
import { WebhookDispatchService } from './dispatch/webhook-dispatch.service';
import { WebhookEventListener } from './listeners/webhook-event.listener';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    AuthModule,
    CryptoModule,
    ApiKeysModule,
    QueueModule,
    MailerModule,
    TransactionsModule,
    PlansModule,
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookDispatchService,
    WebhookEventListener,
    WebhookDeliveryWorker,
    HttpWebhookDispatcher,
    SsrfHostnameValidator,
    PublicApiAuthGuard,
    ApiKeyRateLimitGuard,
    AccessPolicyGuard,
  ],
})
export class WebhooksModule {}
