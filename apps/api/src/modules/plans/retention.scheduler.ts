import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { PlanLimits } from './plan-limits.service';

const REFRESH_TOKEN_GRACE_DAYS = 30;
// docs/05_MODELO_DATOS.md §7: "raw_notifications se conservan 90 días en base
// de datos; posteriormente se archivan en almacenamiento de objetos y se
// eliminan de la tabla". Fijo, no depende del plan.
const RAW_NOTIFICATION_ARCHIVE_AFTER_DAYS = 90;

/**
 * Retención de datos según el plan del tenant (docs/10, Sprint 7;
 * docs/05_MODELO_DATOS.md §7). Corre a diario, después del cierre de período.
 *
 * `raw_notifications` solo se MARCA archivada (`archivedAt`), nunca se borra
 * aquí: el documento describe archivarla en almacenamiento de objetos antes
 * de eliminarla de la tabla, y este proyecto todavía no integra un proveedor
 * de almacenamiento de objetos. Borrarla sin ese paso sería pérdida de datos
 * real, no una simplificación aceptable — queda pendiente, ver docs/10.
 *
 * `audit_events` NO se toca: se conserva un mínimo de 24 meses
 * independientemente del plan (docs/05 §7), y además el motor ya impide que
 * el rol de la aplicación la modifique o elimine (migración
 * `audit_events_immutability`).
 */
@Injectable()
export class RetentionScheduler {
  private readonly logger = new Logger(RetentionScheduler.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Cron('30 3 * * *')
  async runRetention(): Promise<void> {
    await this.cleanupExpiredTokens();
    await this.archiveOldRawNotifications();
    await this.deleteExpiredDataByPlan();
  }

  private async cleanupExpiredTokens(): Promise<void> {
    const refreshCutoff = new Date(Date.now() - REFRESH_TOKEN_GRACE_DAYS * 24 * 60 * 60_000);
    const [refreshDeleted, oneTimeDeleted] = await this.prisma.withoutTenantScope((tx) =>
      Promise.all([
        tx.refreshToken.deleteMany({ where: { expiresAt: { lt: refreshCutoff } } }),
        tx.oneTimeToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      ]),
    );
    this.logger.log(
      `Retention: removed ${refreshDeleted.count} expired refresh token(s), ${oneTimeDeleted.count} expired one-time token(s).`,
    );
  }

  private async archiveOldRawNotifications(): Promise<void> {
    const cutoff = new Date(Date.now() - RAW_NOTIFICATION_ARCHIVE_AFTER_DAYS * 24 * 60 * 60_000);
    const { count } = await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.updateMany({
        where: { archivedAt: null, receivedAt: { lt: cutoff } },
        data: { archivedAt: new Date() },
      }),
    );
    this.logger.log(
      `Retention: marked ${count} raw notification(s) older than ${RAW_NOTIFICATION_ARCHIVE_AFTER_DAYS} days as archived.`,
    );
  }

  /** `transactions` y `webhook_deliveries` según `plan.limits.retention_days` de cada tenant. */
  private async deleteExpiredDataByPlan(): Promise<void> {
    const subscriptions = await this.prisma.withoutTenantScope((tx) =>
      tx.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { plan: true },
      }),
    );

    for (const subscription of subscriptions) {
      const retentionDays = (subscription.plan.limits as PlanLimits).retention_days;
      if (typeof retentionDays !== 'number' || retentionDays <= 0) continue;

      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60_000);
      await this.prisma.withoutTenantScope((tx) =>
        Promise.all([
          tx.transaction.deleteMany({
            where: { tenantId: subscription.tenantId, occurredAt: { lt: cutoff } },
          }),
          tx.webhookDelivery.deleteMany({
            where: { tenantId: subscription.tenantId, createdAt: { lt: cutoff } },
          }),
        ]),
      );
    }

    this.logger.log(`Retention: applied per-plan retention to ${subscriptions.length} tenant(s).`);
  }
}
