import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DeviceStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';

const OFFLINE_THRESHOLD_MS = 15 * 60 * 1_000;
const CHECK_INTERVAL_MS = 60 * 1_000;

/**
 * RF-DEV-007/008: marca como caído todo dispositivo activo sin heartbeat
 * reciente y avisa al negocio. La recuperación se detecta y notifica en el
 * propio endpoint de heartbeat (`DeviceGatewayService.notifyRecovery`), no aquí:
 * ese es el único punto donde se sabe, en el momento, que un dispositivo volvió.
 *
 * Es un trabajo de sistema, transversal a todos los tenants por naturaleza,
 * igual que el registro/ingreso: corre siempre fuera del contexto de un tenant.
 */
@Injectable()
export class DeviceOfflineScheduler {
  private readonly logger = new Logger(DeviceOfflineScheduler.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailerService) private readonly mailer: MailerService,
  ) {}

  @Interval(CHECK_INTERVAL_MS)
  async detectOfflineDevices(): Promise<void> {
    const threshold = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

    const newlyOffline = await this.prisma.withoutTenantScope(async (tx) => {
      const candidates = await tx.device.findMany({
        where: {
          status: DeviceStatus.ACTIVE,
          offlineNotifiedAt: null,
          OR: [
            { lastSeenAt: { lt: threshold } },
            { lastSeenAt: null, pairedAt: { lt: threshold } },
          ],
        },
        include: {
          tenant: true,
        },
      });
      if (candidates.length === 0) return [];

      const marked = await tx.device.updateMany({
        where: { id: { in: candidates.map((device) => device.id) }, offlineNotifiedAt: null },
        data: { offlineNotifiedAt: new Date() },
      });
      this.logger.log(`Marked ${marked.count} device(s) as offline.`);

      const recipients = await tx.membership.findMany({
        where: {
          tenantId: { in: candidates.map((device) => device.tenantId) },
          role: { in: ['OWNER', 'ADMIN'] },
        },
        include: { user: true },
      });
      const recipientsByTenant = new Map<string, typeof recipients>();
      for (const membership of recipients) {
        const list = recipientsByTenant.get(membership.tenantId) ?? [];
        list.push(membership);
        recipientsByTenant.set(membership.tenantId, list);
      }

      return candidates.map((device) => ({
        device,
        recipients: recipientsByTenant.get(device.tenantId) ?? [],
      }));
    });

    await Promise.all(
      newlyOffline.flatMap(({ device, recipients }) =>
        recipients.map((membership) =>
          this.mailer.sendDeviceOfflineEmail({
            email: membership.user.email,
            fullName: membership.user.fullName,
            deviceLabel: device.label,
            businessName: device.tenant.businessName,
          }),
        ),
      ),
    );
  }
}
