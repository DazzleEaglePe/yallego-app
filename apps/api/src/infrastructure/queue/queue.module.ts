import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';

import type { Environment } from '../../config/env.schema';
import { REDIS_CLIENT } from '../cache/redis.module';
import { PARSING_QUEUE, WEBHOOK_QUEUE } from './queue.constants';

/**
 * BullMQ sobre Redis (docs/04_ARQUITECTURA_SOFTWARE.md §3, `infrastructure/queue`).
 * Módulo compartido: cualquier feature module que necesite encolar o consumir
 * trabajos de parsing importa este módulo.
 *
 * `BULLMQ_PREFIX` (opcional) separa el espacio de claves de Redis. En
 * pruebas cada archivo fija un valor único para no compartir colas con otros
 * archivos ni con jobs huérfanos de una corrida anterior interrumpida, ya
 * que Redis, a diferencia de la base de pruebas, no se limpia entre corridas.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [REDIS_CLIENT, ConfigService],
      useFactory: (connection: Redis, config: ConfigService<Environment, true>) => ({
        connection,
        prefix: config.get('BULLMQ_PREFIX', { infer: true }) ?? 'bull',
      }),
    }),
    BullModule.registerQueue({
      name: PARSING_QUEUE,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { age: 3_600 },
        removeOnFail: { age: 86_400 },
      },
    }),
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE,
      defaultJobOptions: {
        // El calendario de reintentos exacto (docs/04_ARQUITECTURA_SOFTWARE.md
        // §5.2) lo administra `WebhookDeliveryWorker` reencolando con el delay
        // que corresponda, no el backoff automático de BullMQ — por eso un
        // solo intento por job.
        attempts: 1,
        removeOnComplete: { age: 3_600 },
        removeOnFail: { age: 86_400 },
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
