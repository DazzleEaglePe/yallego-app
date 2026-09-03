import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

import type { Environment } from '../../config/env.schema';
import { REDIS_CLIENT } from '../../infrastructure/cache/redis.module';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import { WEBHOOK_QUEUE, type WebhookDeliveryJob } from '../../infrastructure/queue/queue.constants';

const CHECK_INTERVAL_MS = 5 * 60_000;
const ALERT_DEDUPE_TTL_SECONDS = 60 * 60;
const DEDUPE_KEY = 'alert:webhook-queue-depth';

/**
 * RNF-OBS-005: alerta cuando la profundidad de la cola de webhooks supera el
 * umbral configurado — señal de que `WebhookDeliveryWorker` no da abasto o
 * está caído. Chequeo de plataforma: la cola es compartida entre tenants.
 */
@Injectable()
export class WebhookQueueDepthAlertScheduler {
  private readonly logger = new Logger(WebhookQueueDepthAlertScheduler.name);

  constructor(
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue<WebhookDeliveryJob>,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(MailerService) private readonly mailer: MailerService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(ConfigService) private readonly config: ConfigService<Environment, true>,
  ) {}

  @Interval(CHECK_INTERVAL_MS)
  async checkQueueDepth(): Promise<void> {
    const depth = await this.queue.getWaitingCount();
    this.metrics.webhookQueueDepth.set(depth);

    const threshold = this.config.get('WEBHOOK_QUEUE_DEPTH_ALERT_THRESHOLD', { infer: true });
    if (depth <= threshold) return;

    const acquired = await this.redis.set(DEDUPE_KEY, '1', 'EX', ALERT_DEDUPE_TTL_SECONDS, 'NX');
    if (!acquired) return;

    this.logger.warn(
      `Cola de webhooks con ${depth} trabajos en espera, por encima del umbral de ${threshold}.`,
    );

    const admins = await this.prisma.withoutTenantScope((tx) =>
      tx.platformAdmin.findMany({ where: { isActive: true } }),
    );
    const message = `La cola de entrega de webhooks acumuló ${depth} trabajos en espera (umbral: ${threshold}). Puede indicar que el worker de entregas dejó de procesar o que la carga superó su capacidad — revisa el proceso de \`WebhookDeliveryWorker\`.`;

    await Promise.all(
      admins.map((admin) =>
        this.mailer.sendPlatformAlertEmail({
          email: admin.email,
          fullName: admin.fullName,
          subject: 'La cola de entrega de webhooks acumuló un backlog',
          message,
        }),
      ),
    );
  }
}
