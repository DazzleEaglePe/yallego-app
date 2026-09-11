import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { IngestItemResult, IngestNotificationsInput } from '@yallego/contracts';

import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { withSpan } from '../../../shared/observability/trace';
import type { DeviceContext } from '../../../shared/guards/device-token.guard';
import { EntitlementService } from '../../plans/entitlement.service';
import { PlanLimitsService, type PlanLimits } from '../../plans/plan-limits.service';
import { computeDedupeHash } from '../domain/dedupe-hash';
import { PARSING_QUEUE_PORT, type ParsingQueuePort } from '../ports/parsing-queue.port';

@Injectable()
export class IngestNotificationsUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PARSING_QUEUE_PORT) private readonly parsingQueue: ParsingQueuePort,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
    @Inject(EntitlementService) private readonly entitlementService: EntitlementService,
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
    const subscription = await this.entitlementService.getCurrentSubscription(device.tenantId);
    this.entitlementService.assertCanOperate(this.entitlementService.evaluate(subscription));

    // El gate por conteo en vivo (transactions_per_month) es para planes de
    // pago; en TRIAL la cuota atómica de EntitlementService.reserveQuota,
    // más abajo, ya cubre día y total (docs/14 §4.3).
    if (subscription?.plan.code !== 'TRIAL') {
      await this.assertWithinTransactionLimit(device.tenantId);
    }

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

    const { insertedByHash, quotaRejectedHashes, blockedReason } = await this.prisma.withTenant(
      device.tenantId,
      async (tx) => {
        const values = items.map(
          (item) =>
            Prisma.sql`(${device.tenantId}::uuid, ${device.id}::uuid, ${item.packageName}, ${item.title}, ${item.body}, ${item.dedupeHash}, ${item.postedAt}::timestamptz, 'PENDING'::parse_status)`,
        );

        const insertedRows = await tx.$queryRaw<Array<{ id: string; dedupe_hash: string }>>`
          INSERT INTO raw_notifications
            (tenant_id, device_id, package_name, title, body, dedupe_hash, posted_at, parse_status)
          VALUES ${Prisma.join(values)}
          ON CONFLICT (device_id, dedupe_hash) DO NOTHING
          RETURNING id, dedupe_hash
        `;

        // La reserva atómica de cuota vive en la MISMA transacción que este
        // INSERT (docs/14 §4.3): bajo concurrencia, dos lotes compiten por
        // la misma fila de usage_buckets con bloqueo de fila de Postgres,
        // así que la suma reservada nunca puede pasar del límite del plan.
        const reservation = await this.entitlementService.reserveQuota(
          tx,
          device.tenantId,
          insertedRows.length,
        );
        const rejectedRows = insertedRows.slice(reservation.reservedCount);
        if (rejectedRows.length > 0) {
          await tx.rawNotification.deleteMany({
            where: { id: { in: rejectedRows.map((row) => row.id) } },
          });
        }

        return {
          insertedByHash: new Map(
            insertedRows.slice(0, reservation.reservedCount).map((row) => [row.dedupe_hash, row.id]),
          ),
          quotaRejectedHashes: new Set(rejectedRows.map((row) => row.dedupe_hash)),
          blockedReason: reservation.blockedReason,
        };
      },
    );

    const accepted: IngestItemResult[] = [];
    const rejected: Array<{ client_ref: string; reason: string }> = [];

    for (const item of items) {
      const insertedId = insertedByHash.get(item.dedupeHash);
      if (insertedId) {
        accepted.push({
          client_ref: item.clientRef,
          notification_id: insertedId,
          status: 'QUEUED',
        });
        await this.parsingQueue.enqueue(insertedId);
        continue;
      }
      if (quotaRejectedHashes.has(item.dedupeHash)) {
        rejected.push({ client_ref: item.clientRef, reason: blockedReason ?? 'PLAN_LIMIT_EXCEEDED' });
        continue;
      }
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

    for (const item of accepted) {
      this.metrics.ingestNotificationsTotal.inc({
        status: item.status === 'QUEUED' ? 'accepted' : 'duplicate',
      });
    }

    return { accepted, rejected };
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
