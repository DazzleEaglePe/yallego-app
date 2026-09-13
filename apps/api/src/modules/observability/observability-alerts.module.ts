import { Module } from '@nestjs/common';

import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { ParsingSuccessAlertScheduler } from './parsing-success-alert.scheduler';
import { ProductMetricsCollector } from './product-metrics.collector';
import { WebhookQueueDepthAlertScheduler } from './webhook-queue-depth-alert.scheduler';

@Module({
  imports: [QueueModule, MailerModule],
  providers: [
    ParsingSuccessAlertScheduler,
    ProductMetricsCollector,
    WebhookQueueDepthAlertScheduler,
  ],
})
export class ObservabilityAlertsModule {}
