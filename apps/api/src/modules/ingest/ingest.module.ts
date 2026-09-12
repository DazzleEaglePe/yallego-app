import { Module } from '@nestjs/common';

import { QueueModule } from '../../infrastructure/queue/queue.module';
import { DeviceTokenGuard } from '../../shared/guards/device-token.guard';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { IngestNotificationsUseCase } from './application/ingest-notifications.usecase';
import { BullMqParsingQueueAdapter } from './adapters/bullmq-parsing-queue.adapter';
import { IngestController } from './adapters/ingest.controller';
import { PARSING_QUEUE_PORT } from './ports/parsing-queue.port';

@Module({
  imports: [QueueModule, AuthModule, PlansModule],
  controllers: [IngestController],
  providers: [
    DeviceTokenGuard,
    IngestNotificationsUseCase,
    { provide: PARSING_QUEUE_PORT, useClass: BullMqParsingQueueAdapter },
  ],
})
export class IngestModule {}
