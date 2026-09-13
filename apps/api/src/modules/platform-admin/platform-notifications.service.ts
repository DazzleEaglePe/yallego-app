import { InjectQueue } from '@nestjs/bullmq';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ParseStatus } from '@prisma/client';
import type {
  ListUnmatchedNotificationsQuery,
  UnmatchedNotificationSummary,
} from '@yallego/contracts';
import type { Queue } from 'bullmq';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  PARSING_QUEUE,
  type ParseNotificationJob,
} from '../../infrastructure/queue/queue.constants';
import { ApiHttpException } from '../../shared/errors/api-http.exception';

/** RF-ADM-007/RF-WAL-010 (docs/02 §12, §5): ver notificaciones que ningún parser reconoció, y reprocesarlas tras corregir el parser. */
@Injectable()
export class PlatformNotificationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue(PARSING_QUEUE) private readonly parsingQueue: Queue<ParseNotificationJob>,
  ) {}

  async listUnmatched(
    query: ListUnmatchedNotificationsQuery,
  ): Promise<UnmatchedNotificationSummary[]> {
    const androidPackage = query.wallet_code
      ? (await this.prisma.wallet.findUnique({ where: { code: query.wallet_code } }))
          ?.androidPackage
      : undefined;
    if (query.wallet_code && !androidPackage) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La billetera no existe.');
    }

    const rows = await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.findMany({
        where: {
          parseStatus: ParseStatus.UNMATCHED,
          ...(androidPackage ? { packageName: androidPackage } : {}),
        },
        orderBy: { receivedAt: 'desc' },
        take: query.limit,
      }),
    );

    return rows.map((row) => ({
      id: row.id,
      package_name: row.packageName,
      title: row.title,
      body: row.body,
      posted_at: row.postedAt.toISOString(),
      parse_error: row.parseError,
    }));
  }

  /** Vuelve a encolar cada notificación para el pipeline normal de parsing (docs/04 §5.1) — no duplica la lógica de `ParseNotificationUseCase`, la reutiliza. */
  async reprocess(
    rawNotificationIds: string[],
    platformAdminId: string,
  ): Promise<{ requeued: number }> {
    const eligible = await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.findMany({
        where: {
          id: { in: rawNotificationIds },
          parseStatus: { in: [ParseStatus.UNMATCHED, ParseStatus.ERROR] },
        },
      }),
    );
    if (eligible.length === 0) return { requeued: 0 };

    await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.updateMany({
        where: { id: { in: eligible.map((row) => row.id) } },
        data: { parseStatus: ParseStatus.PENDING, parseError: null },
      }),
    );

    for (const row of eligible) {
      // `jobId` distinto del original: si ese job todavía no se limpió
      // (`removeOnComplete`/`removeOnFail` tienen una ventana de retención),
      // reusar el mismo id haría que BullMQ devolviera el job viejo sin
      // encolar uno nuevo.
      await this.parsingQueue.add(
        'parse',
        { rawNotificationId: row.id },
        { jobId: `${row.id}-reprocess-${Date.now()}` },
      );
    }

    await this.prisma.withoutTenantScope((tx) =>
      tx.auditEvent.create({
        data: {
          action: 'platform.notifications_reprocessed',
          actorType: 'PLATFORM_ADMIN',
          actorPlatformAdminId: platformAdminId,
          resourceType: 'raw_notification',
          metadata: { raw_notification_ids: eligible.map((row) => row.id) },
        },
      }),
    );

    return { requeued: eligible.length };
  }
}
