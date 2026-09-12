import { Inject, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { PlanLimitsService, UNLIMITED, type PlanLimits } from './plan-limits.service';

type CounterField = 'transactionsCount' | 'apiCallsCount' | 'webhookCallsCount';

/**
 * Contadores de uso por período (docs/10, Sprint 7). Independientes de la
 * verificación de límites: `IngestNotificationsUseCase` sigue haciendo su
 * propio conteo en vivo de `transactions` para decidir si acepta la
 * ingesta (la fuente de verdad, no puede tener drift). Estos contadores
 * existen para exhibir el consumo (`GET /v1/subscription`) sin una consulta
 * de agregación cada vez, y para disparar los avisos de umbral (RF-TXN-016).
 */
@Injectable()
export class UsageCounterService {
  private readonly logger = new Logger(UsageCounterService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
    @Inject(MailerService) private readonly mailer: MailerService,
  ) {}

  async incrementTransactions(tenantId: string): Promise<void> {
    await this.increment(tenantId, 'transactionsCount');
    await this.checkTransactionThreshold(tenantId).catch((error: unknown) => {
      // El aviso de consumo nunca debe tumbar el pipeline de parsing que lo originó.
      this.logger.error(`Failed to check usage threshold for tenant ${tenantId}: ${String(error)}`);
    });
  }

  async incrementApiCalls(tenantId: string): Promise<void> {
    await this.increment(tenantId, 'apiCallsCount');
  }

  async incrementWebhookCalls(tenantId: string): Promise<void> {
    await this.increment(tenantId, 'webhookCallsCount');
  }

  private async increment(tenantId: string, field: CounterField): Promise<void> {
    const subscription = await this.planLimits.getActiveSubscription(tenantId);
    if (!subscription) return;

    await this.prisma.withoutTenantScope((tx) =>
      tx.usagePeriod.upsert({
        where: { tenantId_periodStart: { tenantId, periodStart: subscription.periodStart } },
        create: {
          tenantId,
          periodStart: subscription.periodStart,
          periodEnd: subscription.periodEnd,
          [field]: 1,
        },
        update: { [field]: { increment: 1 } },
      }),
    );
  }

  private async checkTransactionThreshold(tenantId: string): Promise<void> {
    const subscription = await this.planLimits.getActiveSubscription(tenantId);
    if (!subscription) return;

    const limits = subscription.plan.limits as PlanLimits;
    const limit = limits.transactions_per_month;
    if (typeof limit !== 'number' || limit === UNLIMITED) return;

    const usage = await this.prisma.withoutTenantScope((tx) =>
      tx.usagePeriod.findUnique({
        where: { tenantId_periodStart: { tenantId, periodStart: subscription.periodStart } },
      }),
    );
    if (!usage) return;

    const ratio = usage.transactionsCount / limit;
    const percentage: 80 | 100 | null =
      ratio >= 1 && !usage.notifiedAt100 ? 100 : ratio >= 0.8 && !usage.notifiedAt80 ? 80 : null;
    if (percentage === null) return;

    const [tenant, recipients] = await this.prisma.withoutTenantScope((tx) =>
      Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId } }),
        tx.membership.findMany({
          where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
          include: { user: true },
        }),
      ]),
    );
    if (!tenant) return;

    await Promise.all(
      recipients.map((membership) =>
        this.mailer.sendUsageThresholdEmail({
          email: membership.user.email,
          fullName: membership.user.fullName,
          businessName: tenant.businessName,
          percentage,
          limit,
          resetsAt: subscription.periodEnd.toISOString().slice(0, 10),
        }),
      ),
    );

    await this.prisma.withoutTenantScope((tx) =>
      tx.usagePeriod.update({
        where: { tenantId_periodStart: { tenantId, periodStart: subscription.periodStart } },
        data: percentage === 100 ? { notifiedAt100: new Date() } : { notifiedAt80: new Date() },
      }),
    );
  }
}
