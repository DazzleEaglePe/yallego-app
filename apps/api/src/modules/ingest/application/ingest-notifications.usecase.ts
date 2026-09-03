import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { IngestItemResult, IngestNotificationsInput } from '@yallego/contracts';

import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { withSpan } from '../../../shared/observability/trace';
import type { DeviceContext } from '../../../shared/guards/device-token.guard';
import { PlanLimitsService, type PlanLimits } from '../../plans/plan-limits.service';
import { computeDedupeHash } from '../domain/dedupe-hash';
import { PARSING_QUEUE_PORT, type ParsingQueuePort } from '../ports/parsing-queue.port';

@Injectable()
export class IngestNotificationsUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PARSING_QUEUE_PORT) private readonly parsingQueue: ParsingQueuePort,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  async execute(
    device: DeviceContext,
    input: IngestNotificationsInput,
  ): Promise<{
    accepted: IngestItemResult[];
    rejected: Array<{ client_ref: string; reason: string }>;
  }> {
    return withSpan(
      'ingest.notifications',
      {
        'yallego.tenant_id': device.tenantId,
        'yallego.device_id': device.id,
        'yallego.batch_size': input.notifications.length,
      },
      () => this.doExecute(device, input),
    );
  }

  private async doExecute(
    device: DeviceContext,
    input: IngestNotificationsInput,
  ): Promise<{
    accepted: IngestItemResult[];
    rejected: Array<{ client_ref: string; reason: string }>;
  }> {
    await this.assertWithinTransactionLimit(device.tenantId);

    const items = input.notifications.map((item) => ({
      clientRef: item.client_ref,
      packageName: item.package_name,
      title: item.title ?? null,
      body: item.body ?? null,
      postedAt: new Date(item.posted_at),
      dedupeHash: computeDedupeHash({
        packageName: item.package_name,
        title: item.title ?? null,
        body: item.body ?? null,
        postedAt: new Date(item.posted_at),
      }),
    }));

    const inserted = await this.prisma.withTenant(device.tenantId, async (tx) => {
      const values = items.map(
        (item) =>
          Prisma.sql`(${device.tenantId}::uuid, ${device.id}::uuid, ${item.packageName}, ${item.title}, ${item.body}, ${item.dedupeHash}, ${item.postedAt}::timestamptz, 'PENDING'::parse_status)`,
      );

      return tx.$queryRaw<Array<{ id: string; dedupe_hash: string }>>`
        INSERT INTO raw_notifications
          (tenant_id, device_id, package_name, title, body, dedupe_hash, posted_at, parse_status)
        VALUES ${Prisma.join(values)}
        ON CONFLICT (device_id, dedupe_hash) DO NOTHING
        RETURNING id, dedupe_hash
      `;
    });

    const insertedByHash = new Map(inserted.map((row) => [row.dedupe_hash, row.id]));

    const accepted: IngestItemResult[] = [];
    for (const item of items) {
      const insertedId = insertedByHash.get(item.dedupeHash);
      if (insertedId) {
        accepted.push({
          client_ref: item.clientRef,
          notification_id: insertedId,
          status: 'QUEUED',
        });
        await this.parsingQueue.enqueue(insertedId);
      } else {
        const existing = await this.prisma.withTenant(device.tenantId, (tx) =>
          tx.rawNotification.findUnique({
            where: { deviceId_dedupeHash: { deviceId: device.id, dedupeHash: item.dedupeHash } },
          }),
        );
        accepted.push({
          client_ref: item.clientRef,
          notification_id: existing?.id ?? '',
          status: 'DUPLICATE',
        });
      }
    }

    for (const item of accepted) {
      this.metrics.ingestNotificationsTotal.inc({
        status: item.status === 'QUEUED' ? 'accepted' : 'duplicate',
      });
    }

    return { accepted, rejected: [] };
  }

  private async assertWithinTransactionLimit(tenantId: string): Promise<void> {
    const subscription = await this.planLimits.getActiveSubscription(tenantId);
    if (!subscription) return;

    const currentCount = await this.prisma.withTenant(tenantId, (tx) =>
      tx.transaction.count({
        where: {
          tenantId,
          occurredAt: { gte: subscription.periodStart, lt: subscription.periodEnd },
        },
      }),
    );

    this.planLimits.assertWithin(
      subscription.plan.limits as PlanLimits,
      'transactions_per_month',
      currentCount,
      'Se alcanzó el límite de transacciones del plan para el período actual.',
      { resets_at: subscription.periodEnd.toISOString() },
    );
  }
}
