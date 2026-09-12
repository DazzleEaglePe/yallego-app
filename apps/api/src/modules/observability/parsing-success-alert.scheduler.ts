import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { ParseStatus } from '@prisma/client';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../infrastructure/cache/redis.module';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import type { Environment } from '../../config/env.schema';

const CHECK_INTERVAL_MS = 15 * 60_000;
const WINDOW_MS = 60 * 60_000;
// Evita reenviar el mismo correo en cada corrida de 15 min mientras el
// problema sigue activo — una alerta cada hora es suficiente para operar.
const ALERT_DEDUPE_TTL_SECONDS = 60 * 60;

/**
 * RNF-OBS-004: alerta cuando la tasa de parsing exitoso de una billetera cae
 * por debajo del umbral configurado. Es un chequeo de plataforma (todas las
 * billeteras, de todos los tenants), no un chequeo por tenant como
 * `DeviceOfflineScheduler` — por eso el destinatario son los administradores
 * de plataforma, no el negocio dueño de la transacción.
 */
@Injectable()
export class ParsingSuccessAlertScheduler {
  private readonly logger = new Logger(ParsingSuccessAlertScheduler.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(MailerService) private readonly mailer: MailerService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
    @Inject(ConfigService) private readonly config: ConfigService<Environment, true>,
  ) {}

  @Interval(CHECK_INTERVAL_MS)
  async checkParsingSuccessRate(): Promise<void> {
    const since = new Date(Date.now() - WINDOW_MS);
    const minSampleSize = this.config.get('PARSING_ALERT_MIN_SAMPLE_SIZE', { infer: true });
    const threshold = this.config.get('PARSING_SUCCESS_RATE_ALERT_THRESHOLD', { infer: true });

    const grouped = await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.groupBy({
        by: ['packageName', 'parseStatus'],
        where: { receivedAt: { gte: since }, parseStatus: { not: ParseStatus.PENDING } },
        _count: { _all: true },
      }),
    );
    if (grouped.length === 0) return;

    const byPackage = new Map<string, { parsed: number; total: number }>();
    for (const row of grouped) {
      const entry = byPackage.get(row.packageName) ?? { parsed: 0, total: 0 };
      entry.total += row._count._all;
      if (row.parseStatus === ParseStatus.PARSED) entry.parsed += row._count._all;
      byPackage.set(row.packageName, entry);
    }

    const wallets = await this.prisma.wallet.findMany({
      where: { androidPackage: { in: [...byPackage.keys()] } },
    });
    const walletByPackage = new Map(wallets.map((wallet) => [wallet.androidPackage, wallet]));

    for (const [packageName, { parsed, total }] of byPackage) {
      if (total < minSampleSize) continue;
      const rate = parsed / total;
      const wallet = walletByPackage.get(packageName);
      const walletCode = wallet?.code ?? packageName;
      this.metrics.parsingSuccessRate.set({ wallet_code: walletCode }, rate);

      if (rate >= threshold) continue;

      const dedupeKey = `alert:parsing-success:${walletCode}`;
      const acquired = await this.redis.set(dedupeKey, '1', 'EX', ALERT_DEDUPE_TTL_SECONDS, 'NX');
      if (!acquired) continue; // ya se alertó dentro de la última hora

      this.logger.warn(
        `Tasa de parsing de ${walletCode} en ${(rate * 100).toFixed(1)}% (${parsed}/${total} en la última hora), por debajo del umbral de ${(threshold * 100).toFixed(0)}%.`,
      );
      await this.notifyPlatformAdmins(walletCode, rate, parsed, total);
    }
  }

  private async notifyPlatformAdmins(
    walletCode: string,
    rate: number,
    parsed: number,
    total: number,
  ): Promise<void> {
    const admins = await this.prisma.withoutTenantScope((tx) =>
      tx.platformAdmin.findMany({ where: { isActive: true } }),
    );
    const message = `La tasa de parsing exitoso de ${walletCode} cayó a ${(rate * 100).toFixed(1)}% (${parsed} de ${total} notificaciones) en la última hora. Puede indicar que la billetera cambió el formato de su notificación — revisa los patrones activos desde la administración de parsers.`;

    await Promise.all(
      admins.map((admin) =>
        this.mailer.sendPlatformAlertEmail({
          email: admin.email,
          fullName: admin.fullName,
          subject: `Tasa de parsing de ${walletCode} por debajo del umbral`,
          message,
        }),
      ),
    );
  }
}
