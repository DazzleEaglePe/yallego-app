import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus, TrialEndReason } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';

/**
 * Cierre por tiempo del trial (docs/14, Sprint 9: "expirar por tiempo... sin
 * renovación automática"). `EntitlementService.evaluate()` ya bloquea el
 * acceso operativo en el instante exacto en que `trial_ends_at` pasa, sin
 * depender de este scheduler — su único trabajo es persistir el motivo de
 * cierre y disparar el aviso por correo una sola vez.
 */
@Injectable()
export class TrialExpirationScheduler {
  private readonly logger = new Logger(TrialExpirationScheduler.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailerService) private readonly mailer: MailerService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  @Cron('*/15 * * * *')
  async closeExpiredTrials(): Promise<void> {
    const now = new Date();
    const due = await this.prisma.withoutTenantScope((tx) =>
      tx.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIALING,
          trialEndsAt: { lte: now },
          trialEndedAt: null,
        },
        include: { tenant: true },
      }),
    );
    if (due.length === 0) return;

    let closedCount = 0;
    for (const subscription of due) {
      const closed = await this.prisma.withoutTenantScope((tx) =>
        tx.subscription.updateMany({
          where: {
            id: subscription.id,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt: { lte: now },
            trialEndedAt: null,
          },
          data: {
            trialEndedAt: subscription.trialEndsAt ?? new Date(),
            trialEndReason: TrialEndReason.TIME_LIMIT,
          },
        }),
      );
      // Only the instance that actually performed the state transition may
      // emit metrics or notify users. This also protects a concurrent upgrade.
      if (closed.count !== 1) continue;
      closedCount += 1;
      this.metrics.trialExpiredTotal.inc({ reason: 'TIME_LIMIT' });

      const recipients = await this.prisma.withoutTenantScope((tx) =>
        tx.membership.findMany({
          where: { tenantId: subscription.tenantId, role: { in: ['OWNER', 'ADMIN'] } },
          include: { user: true },
        }),
      );
      await Promise.all(
        recipients.map((membership) =>
          this.mailer.sendTrialEndedEmail({
            email: membership.user.email,
            fullName: membership.user.fullName,
            businessName: subscription.tenant.businessName,
          }),
        ),
      );
    }

    if (closedCount > 0) this.logger.log(`Closed ${closedCount} expired trial(s).`);
  }
}
