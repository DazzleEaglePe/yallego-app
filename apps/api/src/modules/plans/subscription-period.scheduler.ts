import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { addBillingCycle } from './billing-cycle.util';

/**
 * Cierre y apertura de período (docs/10, Sprint 7: "cierre y apertura de
 * período mediante tarea programada"). Corre a diario: revisa qué
 * suscripciones activas ya cruzaron su `periodEnd` y las renueva.
 *
 * También es el único lugar donde se aplica un downgrade ya confirmado
 * (`pendingPlanId`): el nuevo plan solo debe regir a partir del período
 * siguiente, nunca antes (docs/10: "aplicación diferida al reducir de plan").
 */
@Injectable()
export class SubscriptionPeriodScheduler {
  private readonly logger = new Logger(SubscriptionPeriodScheduler.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Cron('0 3 * * *')
  async rolloverDuePeriods(): Promise<void> {
    const due = await this.prisma.withoutTenantScope((tx) =>
      tx.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE, periodEnd: { lte: new Date() } },
      }),
    );
    if (due.length === 0) return;

    for (const subscription of due) {
      const nextCycle = subscription.pendingBillingCycle ?? subscription.billingCycle;
      const nextStart = subscription.periodEnd;
      const nextEnd = addBillingCycle(nextStart, nextCycle);

      await this.prisma.withoutTenantScope((tx) =>
        tx.subscription.update({
          where: { id: subscription.id },
          data: {
            periodStart: nextStart,
            periodEnd: nextEnd,
            ...(subscription.pendingPlanId
              ? {
                  planId: subscription.pendingPlanId,
                  billingCycle: subscription.pendingBillingCycle ?? subscription.billingCycle,
                  pendingPlanId: null,
                  pendingBillingCycle: null,
                }
              : {}),
          },
        }),
      );
    }

    this.logger.log(`Rolled over ${due.length} subscription period(s).`);
  }
}
