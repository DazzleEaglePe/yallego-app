import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HealthIndicatorService) private readonly indicators: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.indicators.check(key);
    try {
      await this.prisma.withoutTenantScope((tx) => tx.$queryRaw`SELECT 1`);
      return indicator.up();
    } catch (error) {
      return indicator.down({ error: error instanceof Error ? error.message : String(error) });
    }
  }
}
