import { Inject, Injectable } from '@nestjs/common';
import type { ParserRules } from '@yallego/parsers';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../../infrastructure/cache/redis.module';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type {
  ActivePatternSet,
  ParserPatternRepositoryPort,
} from '../ports/parser-pattern-repository.port';

const CACHE_TTL_SECONDS = 60;
const CACHE_PREFIX = 'parser-patterns:';

/**
 * Carga los patrones activos de una billetera desde base de datos, con caché
 * en Redis (Sprint 4: "cargador de patrones desde base de datos con caché").
 * La caché tiene TTL corto y además se invalida explícitamente al activar una
 * versión nueva, para que el cambio surta efecto sin esperar su expiración.
 */
@Injectable()
export class PrismaParserPatternRepository implements ParserPatternRepositoryPort {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async findActivePatterns(walletCode: string): Promise<ActivePatternSet | null> {
    const cacheKey = `${CACHE_PREFIX}${walletCode}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as ActivePatternSet;

    const wallet = await this.prisma.wallet.findUnique({ where: { code: walletCode } });
    if (!wallet) return null;

    const active = await this.prisma.parserPattern.findFirst({
      where: { walletId: wallet.id, isActive: true },
    });
    if (!active) return null;

    const result: ActivePatternSet = {
      patternId: active.id,
      rules: active.rules as unknown as ParserRules[],
    };
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }

  async invalidate(walletCode: string): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX}${walletCode}`);
  }
}
