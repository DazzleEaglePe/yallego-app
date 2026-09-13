import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../infrastructure/cache/redis.module';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(HealthIndicatorService) private readonly indicators: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.indicators.check(key);
    try {
      const reply = await this.redis.ping();
      if (reply !== 'PONG') throw new Error(`Respuesta inesperada de Redis: ${reply}`);
      return indicator.up();
    } catch (error) {
      return indicator.down({ error: error instanceof Error ? error.message : String(error) });
    }
  }
}
