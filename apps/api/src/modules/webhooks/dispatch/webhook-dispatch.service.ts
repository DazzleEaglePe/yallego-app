import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, WebhookDelivery } from '@prisma/client';
import type { WebhookEventType } from '@yallego/contracts';
import type { Queue } from 'bullmq';

import {
  WEBHOOK_QUEUE,
  type WebhookDeliveryJob,
} from '../../../infrastructure/queue/queue.constants';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MAX_DELIVERY_ATTEMPTS } from '../domain/retry-policy';
import { buildWebhookPayload, newEventId, type WebhookPayload } from '../domain/webhook-payload';

/**
 * Crea la fila de `WebhookDelivery` (el registro durable de a quién se le
 * debe esa entrega) y encola el job. El worker (`WebhookDeliveryWorker`) es
 * el único que llama a la red; este servicio nunca lo hace, para que
 * encolar sea rápido y no bloquee la petición HTTP o el listener de eventos.
 */
@Injectable()
export class WebhookDispatchService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_QUEUE) private readonly queue: Queue<WebhookDeliveryJob>,
  ) {}

  /** Despacha un evento de dominio a todos los endpoints activos del tenant suscritos a ese tipo. */
  async enqueueForEvent(
    tenantId: string,
    eventType: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookEndpoint.findMany({
        where: { tenantId, deletedAt: null, isEnabled: true, subscribedEvents: { has: eventType } },
      }),
    );
    if (endpoints.length === 0) return;

    const payload = buildWebhookPayload(newEventId(), eventType, data);
    for (const endpoint of endpoints) {
      await this.enqueueForEndpoint(tenantId, endpoint.id, payload, eventType);
    }
  }

  /** Crea la entrega para un endpoint puntual (también usado por el envío de prueba). */
  async enqueueForEndpoint(
    tenantId: string,
    endpointId: string,
    payload: WebhookPayload,
    eventType: WebhookEventType = payload.type,
  ): Promise<WebhookDelivery> {
    const delivery = await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookDelivery.create({
        data: {
          tenantId,
          endpointId,
          eventId: payload.id,
          eventType,
          payload: payload as unknown as Prisma.InputJsonValue,
          status: 'PENDING',
          maxAttempts: MAX_DELIVERY_ATTEMPTS,
          nextAttemptAt: new Date(),
        },
      }),
    );

    // BullMQ rechaza `:` en un `jobId` custom ("Custom Id cannot contain :").
    await this.queue.add(
      'deliver',
      { deliveryId: delivery.id, tenantId },
      { jobId: `${delivery.id}-1`, delay: 0 },
    );
    return delivery;
  }

  /** Reencola una entrega existente con el delay indicado (0 = inmediato); `jobId` único por intento para no chocar con el job original. */
  async scheduleAttempt(
    tenantId: string,
    deliveryId: string,
    delayMs: number,
    attempt: number,
  ): Promise<void> {
    await this.queue.add(
      'deliver',
      { deliveryId, tenantId },
      { jobId: `${deliveryId}-${attempt}`, delay: delayMs },
    );
  }

  async retry(tenantId: string, deliveryId: string): Promise<void> {
    await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'PENDING', nextAttemptAt: new Date() },
      }),
    );
    await this.queue.add(
      'deliver',
      { deliveryId, tenantId },
      { jobId: `${deliveryId}-retry-${Date.now()}`, delay: 0 },
    );
  }
}
