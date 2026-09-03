import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  PARSING_QUEUE,
  type ParseNotificationJob,
} from '../../../infrastructure/queue/queue.constants';
import type { ParsingQueuePort } from '../ports/parsing-queue.port';

@Injectable()
export class BullMqParsingQueueAdapter implements ParsingQueuePort {
  constructor(@InjectQueue(PARSING_QUEUE) private readonly queue: Queue<ParseNotificationJob>) {}

  async enqueue(rawNotificationId: string): Promise<void> {
    await this.queue.add(
      'parse',
      { rawNotificationId },
      // Idempotente: si el mismo `rawNotificationId` ya tiene un job en la
      // cola, no se duplica (protege contra un reintento de ingesta).
      { jobId: rawNotificationId },
    );
  }
}
