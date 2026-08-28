import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { HealthResponse } from '@yallego/contracts';

import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(PrismaHealthIndicator) private readonly prismaIndicator: PrismaHealthIndicator,
    @Inject(RedisHealthIndicator) private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  /** Liveness: el proceso responde. No depende de infraestructura externa
   * a propósito — si dependiera de la base de datos, una caída de Postgres
   * derivaría en reinicios en cadena del contenedor en vez de degradación
   * controlada. Para eso está `/health/ready`. */
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'yallego-api',
      timestamp: new Date().toISOString(),
    };
  }

  /** RNF-OBS-008: readiness — valida conectividad real con Postgres y Redis. */
  @Get('ready')
  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      () => this.prismaIndicator.check('database'),
      () => this.redisIndicator.check('redis'),
    ]);
  }
}
