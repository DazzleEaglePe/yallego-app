import { randomBytes } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  ListWebhookDeliveriesQuery,
  RegisterWebhookInput,
  UpdateWebhookInput,
  WebhookDeliveryListResponse,
  WebhookDeliverySummary,
  WebhookEndpointCreated,
  WebhookEndpointSummary,
  WebhookEventType,
} from '@yallego/contracts';

import { EncryptionService } from '../../infrastructure/crypto/encryption.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { TenantResourceContext } from '../../shared/guards/tenant.guard';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { SsrfHostnameValidator } from './adapters/ssrf-hostname-validator';
import { WebhookDispatchService } from './dispatch/webhook-dispatch.service';
import { buildWebhookPayload, newEventId } from './domain/webhook-payload';

const SECRET_PREFIX = 'whsec_';
// Ventana durante la cual una entrega firmada con el secreto anterior sigue
// siendo válida tras rotar (docs/10, "rotación con ventana de transición").
// Los docs no fijan un valor: 24 h le da tiempo a un integrador para
// actualizar su verificación sin dejar de aceptar entregas en curso.
const SECRET_ROTATION_WINDOW_MS = 24 * 60 * 60_000;

const SAMPLE_TEST_PAYLOAD_DATA = {
  transaction: {
    id: '00000000-0000-0000-0000-000000000000',
    wallet: { code: 'YAPE', display_name: 'Yape' },
    sender_name: 'JUAN CARLOS PEREZ R.',
    amount: '35.50',
    currency: 'PEN',
    security_code: '247',
    status: 'CAPTURED',
    occurred_at: new Date(0).toISOString(),
    device: { id: '00000000-0000-0000-0000-000000000000', label: 'Evento de prueba' },
  },
};

/** Quien administra el webhook: un usuario del panel, o una integración autenticada por API key (`webhooks:write` también es un scope válido de clave). */
export type WebhookActor = { type: 'user'; userId: string } | { type: 'api_key'; apiKeyId: string };

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EncryptionService) private readonly cipher: EncryptionService,
    @Inject(SsrfHostnameValidator) private readonly ssrf: SsrfHostnameValidator,
    @Inject(WebhookDispatchService) private readonly dispatch: WebhookDispatchService,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
  ) {}

  async list(tenant: TenantResourceContext): Promise<WebhookEndpointSummary[]> {
    const rows = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.webhookEndpoint.findMany({
        where: { tenantId: tenant.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return rows.map(toSummary);
  }

  async getById(tenant: TenantResourceContext, endpointId: string) {
    const row = await this.findActiveOrThrow(tenant.id, endpointId);
    return toSummary(row);
  }

  async create(
    tenant: TenantResourceContext,
    actor: WebhookActor,
    input: RegisterWebhookInput,
  ): Promise<WebhookEndpointCreated> {
    await this.assertWithinEndpointLimit(tenant.id);
    await this.ssrf.assertPublicHostname(input.url);

    const secret = generateSecret();
    const created = await this.prisma.withTenant(tenant.id, async (tx) => {
      const endpoint = await tx.webhookEndpoint.create({
        data: {
          tenantId: tenant.id,
          url: input.url,
          secretEncrypted: Buffer.from(this.cipher.encrypt(secret)),
          subscribedEvents: input.subscribed_events,
          description: input.description ?? null,
          createdBy: actor.type === 'user' ? actor.userId : null,
        },
      });
      await tx.auditEvent.create({
        data: {
          ...actorAuditFields(actor),
          tenantId: tenant.id,
          action: 'webhooks.created',
          resourceType: 'webhook_endpoint',
          resourceId: endpoint.id,
          metadata: { url: input.url, subscribed_events: input.subscribed_events },
        },
      });
      return endpoint;
    });

    return { ...toSummary(created), secret };
  }

  async update(
    tenant: TenantResourceContext,
    actor: WebhookActor,
    endpointId: string,
    input: UpdateWebhookInput,
  ): Promise<WebhookEndpointSummary> {
    await this.findActiveOrThrow(tenant.id, endpointId);

    const updated = await this.prisma.withTenant(tenant.id, async (tx) => {
      const endpoint = await tx.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          ...(input.subscribed_events !== undefined
            ? { subscribedEvents: input.subscribed_events }
            : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.is_enabled !== undefined ? { isEnabled: input.is_enabled } : {}),
        },
      });
      await tx.auditEvent.create({
        data: {
          ...actorAuditFields(actor),
          tenantId: tenant.id,
          action: 'webhooks.updated',
          resourceType: 'webhook_endpoint',
          resourceId: endpointId,
          metadata: input,
        },
      });
      return endpoint;
    });

    return toSummary(updated);
  }

  async remove(
    tenant: TenantResourceContext,
    actor: WebhookActor,
    endpointId: string,
  ): Promise<void> {
    await this.findActiveOrThrow(tenant.id, endpointId);

    await this.prisma.withTenant(tenant.id, async (tx) => {
      await tx.webhookEndpoint.update({
        where: { id: endpointId },
        data: { deletedAt: new Date(), isEnabled: false },
      });
      await tx.auditEvent.create({
        data: {
          ...actorAuditFields(actor),
          tenantId: tenant.id,
          action: 'webhooks.deleted',
          resourceType: 'webhook_endpoint',
          resourceId: endpointId,
        },
      });
    });
  }

  async rotateSecret(
    tenant: TenantResourceContext,
    actor: WebhookActor,
    endpointId: string,
  ): Promise<WebhookEndpointCreated> {
    const existing = await this.findActiveOrThrow(tenant.id, endpointId);
    const secret = generateSecret();

    const updated = await this.prisma.withTenant(tenant.id, async (tx) => {
      const endpoint = await tx.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          secretEncrypted: Buffer.from(this.cipher.encrypt(secret)),
          previousSecretEncrypted: existing.secretEncrypted,
          previousSecretExpiresAt: new Date(Date.now() + SECRET_ROTATION_WINDOW_MS),
        },
      });
      await tx.auditEvent.create({
        data: {
          ...actorAuditFields(actor),
          tenantId: tenant.id,
          action: 'webhooks.secret_rotated',
          resourceType: 'webhook_endpoint',
          resourceId: endpointId,
        },
      });
      return endpoint;
    });

    return { ...toSummary(updated), secret };
  }

  async sendTestEvent(
    tenant: TenantResourceContext,
    endpointId: string,
  ): Promise<{ delivery_id: string }> {
    const endpoint = await this.findActiveOrThrow(tenant.id, endpointId);
    const payload = buildWebhookPayload(
      newEventId(),
      'transaction.created',
      SAMPLE_TEST_PAYLOAD_DATA,
    );
    const delivery = await this.dispatch.enqueueForEndpoint(tenant.id, endpoint.id, payload);
    return { delivery_id: delivery.id };
  }

  async listDeliveries(
    tenant: TenantResourceContext,
    endpointId: string,
    query: ListWebhookDeliveriesQuery,
  ): Promise<WebhookDeliveryListResponse> {
    await this.findActiveOrThrow(tenant.id, endpointId);

    const rows = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.webhookDelivery.findMany({
        where: {
          tenantId: tenant.id,
          endpointId,
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      }),
    );

    return { data: rows.map(toDeliverySummary) };
  }

  async retryDelivery(
    tenant: TenantResourceContext,
    actor: WebhookActor,
    endpointId: string,
    deliveryId: string,
  ): Promise<{ delivery_id: string }> {
    await this.findActiveOrThrow(tenant.id, endpointId);

    const delivery = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.webhookDelivery.findUnique({ where: { id: deliveryId } }),
    );
    if (!delivery || delivery.tenantId !== tenant.id || delivery.endpointId !== endpointId) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La entrega no existe.');
    }
    if (delivery.status === 'DELIVERED' || delivery.status === 'IN_PROGRESS') {
      throw new ApiHttpException(
        HttpStatus.CONFLICT,
        'CONFLICT',
        'Solo se puede reintentar una entrega fallida o abandonada.',
      );
    }

    await this.dispatch.retry(tenant.id, delivery.id);

    await this.prisma.withTenant(tenant.id, (tx) =>
      tx.auditEvent.create({
        data: {
          ...actorAuditFields(actor),
          tenantId: tenant.id,
          action: 'webhooks.delivery_retried',
          resourceType: 'webhook_delivery',
          resourceId: delivery.id,
          metadata: { endpoint_id: endpointId },
        },
      }),
    );

    return { delivery_id: delivery.id };
  }

  private async findActiveOrThrow(tenantId: string, endpointId: string) {
    const row = await this.prisma.withTenant(tenantId, (tx) =>
      tx.webhookEndpoint.findUnique({ where: { id: endpointId } }),
    );
    if (!row || row.tenantId !== tenantId || row.deletedAt) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El webhook no existe.');
    }
    return row;
  }

  private async assertWithinEndpointLimit(tenantId: string): Promise<void> {
    const currentCount = await this.prisma.withoutTenantScope((tx) =>
      tx.webhookEndpoint.count({ where: { tenantId, deletedAt: null } }),
    );
    await this.planLimits.assertWithinLimit(
      tenantId,
      'webhooks',
      currentCount,
      'Se alcanzó el límite de webhooks del plan actual.',
    );
  }
}

function generateSecret(): string {
  return `${SECRET_PREFIX}${randomBytes(16).toString('hex')}`;
}

function actorAuditFields(actor: WebhookActor): {
  actorType: string;
  actorUserId?: string;
  actorApiKeyId?: string;
} {
  return {
    actorType: actor.type === 'user' ? 'USER' : 'API_KEY',
    actorUserId: actor.type === 'user' ? actor.userId : undefined,
    actorApiKeyId: actor.type === 'api_key' ? actor.apiKeyId : undefined,
  };
}

function toSummary(row: {
  id: string;
  url: string;
  subscribedEvents: string[];
  description: string | null;
  isEnabled: boolean;
  consecutiveFailures: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  createdAt: Date;
}): WebhookEndpointSummary {
  return {
    id: row.id,
    url: row.url,
    subscribed_events: row.subscribedEvents as WebhookEventType[],
    description: row.description,
    is_enabled: row.isEnabled,
    consecutive_failures: row.consecutiveFailures,
    last_success_at: row.lastSuccessAt?.toISOString() ?? null,
    last_failure_at: row.lastFailureAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

function toDeliverySummary(row: {
  id: string;
  eventId: string;
  eventType: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  lastStatusCode: number | null;
  lastError: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
}): WebhookDeliverySummary {
  return {
    id: row.id,
    event_id: row.eventId,
    event_type: row.eventType as WebhookEventType,
    status: row.status as WebhookDeliverySummary['status'],
    attempts: row.attempts,
    max_attempts: row.maxAttempts,
    next_attempt_at: row.nextAttemptAt?.toISOString() ?? null,
    last_attempt_at: row.lastAttemptAt?.toISOString() ?? null,
    last_status_code: row.lastStatusCode,
    last_error: row.lastError,
    delivered_at: row.deliveredAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}
