import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DeviceStatus, TenantStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import {
  DEVICE_OFFLINE_THRESHOLD_MS,
  DEVICE_ONLINE_THRESHOLD_MS,
} from '../devices/device-connectivity';

const COLLECTION_INTERVAL_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

/**
 * Expone snapshots agregados para el dashboard de producto. La base de datos
 * sigue siendo la fuente de verdad; Prometheus solo conserva la serie temporal
 * sin cardinalidad por cliente ni datos personales.
 */
@Injectable()
export class ProductMetricsCollector implements OnModuleInit {
  private readonly logger = new Logger(ProductMetricsCollector.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    void this.collect().catch((error: unknown) => {
      this.logger.error(`Initial product metrics collection failed: ${String(error)}`);
    });
  }

  @Interval(COLLECTION_INTERVAL_MS)
  async collect(): Promise<void> {
    const now = Date.now();
    const onlineSince = new Date(now - DEVICE_ONLINE_THRESHOLD_MS);
    const offlineBefore = new Date(now - DEVICE_OFFLINE_THRESHOLD_MS);
    const dayAgo = new Date(now - DAY_MS);
    const weekAgo = new Date(now - 7 * DAY_MS);
    const monthAgo = new Date(now - 30 * DAY_MS);

    const [
      tenantsByStatus,
      usersTotal,
      usersVerified,
      usersLoggedIn24h,
      usersLoggedIn7d,
      usersLoggedIn30d,
      devicesOnline,
      devicesDegraded,
      devicesOffline,
      devicesInactive,
      transactions24h,
      transactions30d,
    ] = await this.prisma.withoutTenantScope((tx) =>
      Promise.all([
        tx.tenant.groupBy({ by: ['status'], _count: { _all: true } }),
        tx.user.count(),
        tx.user.count({ where: { emailVerified: true } }),
        tx.user.count({ where: { lastLoginAt: { gte: dayAgo } } }),
        tx.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
        tx.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
        tx.device.count({ where: { status: DeviceStatus.ACTIVE, lastSeenAt: { gte: onlineSince } } }),
        tx.device.count({
          where: {
            status: DeviceStatus.ACTIVE,
            lastSeenAt: { gte: offlineBefore, lt: onlineSince },
          },
        }),
        tx.device.count({
          where: {
            status: DeviceStatus.ACTIVE,
            OR: [{ lastSeenAt: { lt: offlineBefore } }, { lastSeenAt: null }],
          },
        }),
        tx.device.count({ where: { status: { not: DeviceStatus.ACTIVE } } }),
        tx.transaction.groupBy({
          by: ['status'],
          where: { occurredAt: { gte: dayAgo } },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        tx.transaction.groupBy({
          by: ['status'],
          where: { occurredAt: { gte: monthAgo } },
          _count: { _all: true },
          _sum: { amount: true },
        }),
      ]),
    );

    this.metrics.productTenants.reset();
    for (const status of Object.values(TenantStatus)) {
      const row = tenantsByStatus.find((tenant) => tenant.status === status);
      this.metrics.productTenants.set({ status }, row?._count._all ?? 0);
    }

    this.metrics.productUsers.reset();
    this.metrics.productUsers.set({ segment: 'total' }, usersTotal);
    this.metrics.productUsers.set({ segment: 'verified' }, usersVerified);
    this.metrics.productUsers.set({ segment: 'logged_in_24h' }, usersLoggedIn24h);
    this.metrics.productUsers.set({ segment: 'logged_in_7d' }, usersLoggedIn7d);
    this.metrics.productUsers.set({ segment: 'logged_in_30d' }, usersLoggedIn30d);

    this.metrics.productDevices.reset();
    this.metrics.productDevices.set({ connectivity: 'online' }, devicesOnline);
    this.metrics.productDevices.set({ connectivity: 'degraded' }, devicesDegraded);
    this.metrics.productDevices.set({ connectivity: 'offline' }, devicesOffline);
    this.metrics.productDevices.set({ connectivity: 'inactive' }, devicesInactive);

    this.metrics.productTransactions.reset();
    this.metrics.productTransactionAmountPen.reset();
    this.setTransactions('24h', transactions24h);
    this.setTransactions('30d', transactions30d);
    this.metrics.productMetricsLastSuccessUnix.set(Math.floor(now / 1_000));
  }

  private setTransactions(
    window: '24h' | '30d',
    rows: Array<{ status: string; _count: { _all: number }; _sum: { amount: unknown } }>,
  ): void {
    let count = 0;
    let amount = 0;
    for (const row of rows) {
      const rowAmount = row._sum.amount === null ? 0 : Number(row._sum.amount);
      count += row._count._all;
      amount += rowAmount;
      this.metrics.productTransactions.set({ window, status: row.status }, row._count._all);
      this.metrics.productTransactionAmountPen.set({ window, status: row.status }, rowAmount);
    }
    this.metrics.productTransactions.set({ window, status: 'all' }, count);
    this.metrics.productTransactionAmountPen.set({ window, status: 'all' }, amount);
  }
}
