import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import { PlatformAuthGuard } from '../platform-auth/platform-auth.guard';
import { PlatformIpAllowlistGuard } from '../platform-auth/platform-ip-allowlist.guard';
import { PlatformMetricsService } from './platform-metrics.service';

@Controller('platform/v1/metrics')
@UseGuards(PlatformIpAllowlistGuard, PlatformAuthGuard)
export class PlatformMetricsController {
  constructor(@Inject(PlatformMetricsService) private readonly metrics: PlatformMetricsService) {}

  @Get()
  getGlobalMetrics() {
    return this.metrics.getGlobalMetrics();
  }
}
