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
    const due = await this.prisma.withoutTenantScope((tx) =>
      tx.subscription.findMany({
        where: {
          status: SubscriptionStatus.TRIALING,
          trialEndsAt: { lte: new Date() },
          trialEndedAt: null,
        },
        include: { tenant: true },
      }),
    );
    if (due.length === 0) return;

    for (const subscription of due) {
      await this.prisma.withoutTenantScope((tx) =>
        tx.subscription.update({
          where: { id: subscription.id },
          data: {
            trialEndedAt: subscription.trialEndsAt ?? new Date(),
            trialEndReason: TrialEndReason.TIME_LIMIT,
          },
        }),
      );
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

    this.logger.log(`Closed ${due.length} expired trial(s).`);
  }
}
