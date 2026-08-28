import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { EncryptionService } from '../../../infrastructure/crypto/encryption.service';
import { PrismaService, type ScopedClient } from '../../../infrastructure/database/prisma.service';
import { MailerService } from '../../../infrastructure/mailer/mailer.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import {
  WEBHOOK_QUEUE,
  type WebhookDeliveryJob,
} from '../../../infrastructure/queue/queue.constants';
import { withSpan } from '../../../shared/observability/trace';
import { UsageCounterService } from '../../plans/usage-counter.service';
import { WebhookDispatchService } from '../dispatch/webhook-dispatch.service';
import { delayBeforeNextAttempt } from '../domain/retry-policy';
import type { WebhookPayload } from '../domain/webhook-payload';
import { HttpWebhookDispatcher } from './http-webhook-dispatcher';
import { SsrfHostnameValidator } from './ssrf-hostname-validator';

// docs/10_PLAN_DESARROLLO.md, Sprint 6: los docs no fijan un umbral para
// deshabilitar un endpoint por fallos sostenidos. 5 entregas consecutivas
// ABANDONADAS (cada una ya agotó los 8 intentos de `retry-policy.ts`, hasta
// ~12h) es una señal fuerte de endpoint roto sin tardar semanas en dispararse.
const AUTO_DISABLE_AFTER_CONSECUTIVE_FAILURES = 5;

/**
 * Ejecuta un intento de entrega por job. El calendario de reintentos NO lo
 * administra BullMQ (la cola se registra con `attempts: 1`): este worker
 * decide el próximo delay con `retry-policy.ts` y reencola él mismo, porque
 * la tabla de espera acumulada del contrato no es una serie geométrica que
 * el backoff automático de BullMQ pueda expresar.
 */
@Processor(WEBHOOK_QUEUE)
export class WebhookDeliveryWorker extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryWorker.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EncryptionService) private readonly cipher: EncryptionService,
    @Inject(SsrfHostnameValidator) private readonly ssrf: SsrfHostnameValidator,
    @Inject(HttpWebhookDispatcher) private readonly http: HttpWebhookDispatcher,
    @Inject(WebhookDispatchService) private readonly dispatch: WebhookDispatchService,
    @Inject(MailerService) private readonly mailer: MailerService,
    @Inject(UsageCounterService) private readonly usageCounter: UsageCounterService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {
    super();
  }

  async process(job: Job<WebhookDeliveryJob>): Promise<void> {
    return withSpan(
      'webhooks.delivery_attempt',
      { 'yallego.tenant_id': job.data.tenantId, 'yallego.delivery_id': job.data.deliveryId },
      () => this.doProcess(job),
    );
  }

  private async doProcess(job: Job<WebhookDeliveryJob>): Promise<void> {
    const { deliveryId, tenantId } = job.data;

    const delivery = await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookDelivery.findUnique({ where: { id: deliveryId }, include: { endpoint: true } }),
    );
    if (!delivery) {
      this.logger.warn(`Delivery ${deliveryId} no existe, se omite.`);
      return;
    }
    if (delivery.status === 'DELIVERED') return; // ya entregada; evita doble entrega si el job se reprocesa

    const { endpoint } = delivery;
    if (!endpoint.isEnabled || endpoint.deletedAt) {
      await this.abandon(
        tenantId,
        deliveryId,
        delivery.attempts,
        null,
        'El endpoint está deshabilitado o fue eliminado.',
      );
      return;
    }

    const attemptNumber = delivery.attempts + 1;

    try {
      await this.ssrf.assertPublicHostname(endpoint.url);
    } catch {
      await this.finalizeFailure(
        tenantId,
        deliveryId,
        endpoint.id,
        attemptNumber,
        null,
        'La URL del webhook ya no resuelve a una red pública.',
      );
      return;
    }

    const currentSecret = this.cipher.decrypt(endpoint.secretEncrypted);
    const previousSecret =
      endpoint.previousSecretEncrypted &&
      endpoint.previousSecretExpiresAt &&
      endpoint.previousSecretExpiresAt > new Date()
        ? this.cipher.decrypt(endpoint.previousSecretEncrypted)
        : undefined;

    this.usageCounter.incrementWebhookCalls(tenantId).catch(() => {});
    const result = await this.http.send(
      endpoint.url,
      deliveryId,
      delivery.payload as unknown as WebhookPayload,
      {
        current: currentSecret,
        previous: previousSecret,
      },
    );

    if (result.ok) {
      await this.finalizeSuccess(
        tenantId,
        deliveryId,
        endpoint.id,
        attemptNumber,
        result.statusCode,
      );
      return;
    }

    if (result.gone) {
      await this.finalizeFailure(
        tenantId,
        deliveryId,
        endpoint.id,
        attemptNumber,
        result.statusCode,
        'El endpoint respondió 410 Gone.',
        {
          disableEndpoint: true,
        },
      );
      return;
    }

    const delay = delayBeforeNextAttempt(attemptNumber);
    if (delay === null) {
      await this.finalizeFailure(
        tenantId,
        deliveryId,
        endpoint.id,
        attemptNumber,
        result.statusCode,
        result.error ?? `Respuesta HTTP ${result.statusCode}`,
      );
      return;
    }

    await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'PENDING',
          attempts: attemptNumber,
          lastAttemptAt: new Date(),
          lastStatusCode: result.statusCode,
          lastError: result.error ?? `HTTP ${result.statusCode}`,
          nextAttemptAt: new Date(Date.now() + delay),
        },
      }),
    );
    await this.dispatch.scheduleAttempt(tenantId, deliveryId, delay, attemptNumber + 1);
  }

  private async finalizeSuccess(
    tenantId: string,
    deliveryId: string,
    endpointId: string,
    attemptNumber: number,
    statusCode: number | null,
  ): Promise<void> {
    await this.prisma.withTenant(tenantId, async (tx) => {
      await tx.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          attempts: attemptNumber,
          lastAttemptAt: new Date(),
          lastStatusCode: statusCode,
          deliveredAt: new Date(),
          nextAttemptAt: null,
        },
      });
      await tx.webhookEndpoint.update({
        where: { id: endpointId },
        data: { consecutiveFailures: 0, lastSuccessAt: new Date() },
      });
    });
    this.metrics.webhookDeliveriesTotal.inc({ result: 'delivered' });
  }

  /** Sin más reintentos posibles: marca la entrega ABANDONADA y, si corresponde, deshabilita el endpoint. */
  private async finalizeFailure(
    tenantId: string,
    deliveryId: string,
    endpointId: string,
    attemptNumber: number,
    statusCode: number | null,
    error: string,
    options: { disableEndpoint?: boolean } = {},
  ): Promise<void> {
    await this.abandon(tenantId, deliveryId, attemptNumber, statusCode, error);

    const notification = await this.prisma.withTenant(tenantId, async (tx) => {
      const endpoint = await tx.webhookEndpoint.update({
        where: { id: endpointId },
        data: { consecutiveFailures: { increment: 1 }, lastFailureAt: new Date() },
      });

      const shouldDisable =
        options.disableEndpoint ||
        endpoint.consecutiveFailures >= AUTO_DISABLE_AFTER_CONSECUTIVE_FAILURES;
      if (!shouldDisable || !endpoint.isEnabled) return null;

      const reason = options.disableEndpoint
        ? 'el destino respondió 410 Gone'
        : 'fallos consecutivos sostenidos';
      return this.disableEndpoint(tx, tenantId, endpoint.id, endpoint.url, reason);
    });

    if (notification) {
      await Promise.all(
        notification.recipients.map((membership) =>
          this.mailer.sendWebhookDisabledEmail({
            email: membership.user.email,
            fullName: membership.user.fullName,
            endpointUrl: notification.endpointUrl,
            businessName: notification.businessName,
            reason: notification.reason,
          }),
        ),
      );
    }
  }

  private async abandon(
    tenantId: string,
    deliveryId: string,
    attempts: number,
    statusCode: number | null,
    error: string,
  ): Promise<void> {
    await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'ABANDONED',
          attempts,
          lastAttemptAt: new Date(),
          lastStatusCode: statusCode,
          lastError: error,
          nextAttemptAt: null,
        },
      }),
    );
    this.metrics.webhookDeliveriesTotal.inc({ result: 'abandoned' });
  }

  private async disableEndpoint(
    tx: ScopedClient,
    tenantId: string,
    endpointId: string,
    endpointUrl: string,
    reason: string,
  ): Promise<{
    recipients: Array<{ user: { email: string; fullName: string } }>;
    endpointUrl: string;
    businessName: string;
    reason: string;
  }> {
    await tx.webhookEndpoint.update({ where: { id: endpointId }, data: { isEnabled: false } });
    await tx.auditEvent.create({
      data: {
        tenantId,
        action: 'webhooks.auto_disabled',
        actorType: 'SYSTEM',
        resourceType: 'webhook_endpoint',
        resourceId: endpointId,
        metadata: { reason },
      },
    });
    this.logger.warn(`Webhook endpoint ${endpointId} auto-disabled: ${reason}`);

    const [tenant, recipients] = await Promise.all([
      tx.tenant.findUnique({ where: { id: tenantId } }),
      tx.membership.findMany({
        where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
        include: { user: true },
      }),
    ]);

    return { recipients, endpointUrl, businessName: tenant?.businessName ?? '', reason };
  }
}
