import { Inject, Injectable } from '@nestjs/common';
import { DeliveryStatus, ParseStatus, TenantStatus } from '@prisma/client';
import type { PlatformMetrics } from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60_000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60_000;

/** RF-ADM-009: tenants activos, volumen de transacciones, tasa de parsing, salud de webhooks. */
@Injectable()
export class PlatformMetricsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getGlobalMetrics(): Promise<PlatformMetrics> {
    const since = new Date(Date.now() - THIRTY_DAYS_MS);
    const rolloutSince = new Date(Date.now() - SEVEN_DAYS_MS);

    const [
      tenantsByStatus,
      transactionAgg,
      parsedCount,
      unmatchedCount,
      endpointsByEnabled,
      deliveriesCount,
      failedDeliveriesCount,
      identityClaimsCount,
      identityReuseObservedCount,
      identityOverridesCount,
      trialConversionsCount,
    ] = await this.prisma.withoutTenantScope((tx) =>
      Promise.all([
        tx.tenant.groupBy({ by: ['status'], _count: true }),
        tx.transaction.aggregate({
          where: { occurredAt: { gte: since } },
          _count: true,
          _sum: { amount: true },
        }),
        tx.rawNotification.count({
          where: { parseStatus: ParseStatus.PARSED, receivedAt: { gte: since } },
        }),
        tx.rawNotification.count({
          where: { parseStatus: ParseStatus.UNMATCHED, receivedAt: { gte: since } },
        }),
        tx.webhookEndpoint.groupBy({ by: ['isEnabled'], where: { deletedAt: null }, _count: true }),
        tx.webhookDelivery.count({ where: { createdAt: { gte: since } } }),
        tx.webhookDelivery.count({
          where: { createdAt: { gte: since }, status: DeliveryStatus.ABANDONED },
        }),
        tx.trialIdentityClaim.count({ where: { claimedAt: { gte: rolloutSince } } }),
        tx.auditEvent.count({
          where: { action: 'trial.identity_reuse_observed', createdAt: { gte: rolloutSince } },
        }),
        tx.auditEvent.count({
          where: { action: 'trial.identity_claim_overridden', createdAt: { gte: rolloutSince } },
        }),
        tx.subscriptionChange.count({
          where: {
            createdAt: { gte: rolloutSince },
            fromPlan: { code: 'TRIAL' },
            toPlan: { code: { notIn: ['TRIAL', 'FREE', 'LEGACY_FREE'] } },
          },
        }),
      ]),
    );

    const countByStatus = new Map(tenantsByStatus.map((row) => [row.status, row._count]));
    const countByEnabled = new Map(endpointsByEnabled.map((row) => [row.isEnabled, row._count]));

    const parsingTotal = parsedCount + unmatchedCount;

    return {
      tenants: {
        total: tenantsByStatus.reduce((sum, row) => sum + row._count, 0),
        active: countByStatus.get(TenantStatus.ACTIVE) ?? 0,
        suspended: countByStatus.get(TenantStatus.SUSPENDED) ?? 0,
      },
      transactions: {
        last_30_days: transactionAgg._count,
        amount_last_30_days: (transactionAgg._sum.amount ?? 0).toFixed(2),
      },
      parsing: {
        parsed_last_30_days: parsedCount,
        unmatched_last_30_days: unmatchedCount,
        success_rate_last_30_days:
          parsingTotal === 0 ? null : Math.round((parsedCount / parsingTotal) * 10_000) / 100,
      },
      webhooks: {
        active_endpoints: countByEnabled.get(true) ?? 0,
        disabled_endpoints: countByEnabled.get(false) ?? 0,
        deliveries_last_30_days: deliveriesCount,
        failed_deliveries_last_30_days: failedDeliveriesCount,
      },
      trial_rollout: {
        identity_claims_last_7_days: identityClaimsCount,
        reuse_observed_last_7_days: identityReuseObservedCount,
        overrides_last_7_days: identityOverridesCount,
        conversions_last_7_days: trialConversionsCount,
      },
    };
  }
}
