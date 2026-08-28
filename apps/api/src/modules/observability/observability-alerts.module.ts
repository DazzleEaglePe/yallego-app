import { Module } from '@nestjs/common';

import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { ParsingSuccessAlertScheduler } from './parsing-success-alert.scheduler';
import { WebhookQueueDepthAlertScheduler } from './webhook-queue-depth-alert.scheduler';

@Module({
  imports: [QueueModule, MailerModule],
  providers: [ParsingSuccessAlertScheduler, WebhookQueueDepthAlertScheduler],
})
export class ObservabilityAlertsModule {}
