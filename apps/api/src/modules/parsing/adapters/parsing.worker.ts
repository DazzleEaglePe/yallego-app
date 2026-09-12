import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import type { ParseNotificationJob } from '../../../infrastructure/queue/queue.constants';
import { PARSING_QUEUE } from '../../../infrastructure/queue/queue.constants';
import { ParseNotificationUseCase } from '../application/parse-notification.usecase';

@Processor(PARSING_QUEUE)
export class ParsingWorker extends WorkerHost {
  private readonly logger = new Logger(ParsingWorker.name);

  constructor(
    @Inject(ParseNotificationUseCase) private readonly parseNotification: ParseNotificationUseCase,
  ) {
    super();
  }

  async process(job: Job<ParseNotificationJob>): Promise<void> {
    try {
      await this.parseNotification.execute(job.data.rawNotificationId);
    } catch (error) {
      this.logger.error(
        `Failed to parse notification ${job.data.rawNotificationId}: ${String(error)}`,
      );
      throw error; // BullMQ reintenta según la política de la cola (backoff exponencial).
    }
  }
}
