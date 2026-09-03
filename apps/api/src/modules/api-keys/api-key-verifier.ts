import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../../infrastructure/cache/redis.module';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TokenService } from '../auth/token.service';

const CACHE_TTL_SECONDS = 60;
const CACHE_PREFIX = 'api-key:';

export interface VerifiedApiKey {
  apiKeyId: string;
  tenantId: string;
  tenantSlug: string;
  tenantBusinessName: string;
  scopes: string[];
  /** `plan.limits.rate_limit_per_minute` (RF-API-010); 0 si el plan no permite acceso a la API pública. */
  rateLimitPerMinute: number;
  /** `plan.limits.websocket_api` (RF-API-013): solo Comercio/Cadena admiten clientes de API key en `/v1/realtime`. */
  websocketApiEnabled: boolean;
}

/**
 * docs/07_SEGURIDAD_AUTH.md §3.2: hash + caché de 60s. La caché se invalida
 * explícitamente al revocar (`ApiKeysService.revoke`), así que la revocación
 * sigue siendo inmediata pese al caché positivo.
 */
@Injectable()
export class ApiKeyVerifier {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async verify(rawKey: string): Promise<VerifiedApiKey | null> {
    const keyHash = this.tokenService.hashOpaqueToken(rawKey);
    const cacheKey = `${CACHE_PREFIX}${keyHash}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as VerifiedApiKey;

    const record = await this.prisma.withoutTenantScope((tx) =>
      tx.apiKey.findUnique({
        where: { keyHash },
        include: {
          tenant: {
            include: {
              subscriptions: {
                where: { status: 'ACTIVE' },
                orderBy: { periodStart: 'desc' },
                take: 1,
                include: { plan: true },
              },
            },
          },
        },
      }),
    );

    const now = new Date();
    if (
      !record ||
      record.revokedAt ||
      (record.expiresAt && record.expiresAt <= now) ||
      record.tenant.status !== 'ACTIVE'
    ) {
      return null;
    }

    const limits = record.tenant.subscriptions[0]?.plan.limits as
      { rate_limit_per_minute?: number; websocket_api?: boolean } | undefined;

    const result: VerifiedApiKey = {
      apiKeyId: record.id,
      tenantId: record.tenantId,
      tenantSlug: record.tenant.slug,
      tenantBusinessName: record.tenant.businessName,
      scopes: record.scopes,
      rateLimitPerMinute: limits?.rate_limit_per_minute ?? 0,
      websocketApiEnabled: limits?.websocket_api ?? false,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);

    // Último uso: no bloquea la respuesta ni afecta si falla.
    this.prisma
      .withoutTenantScope((tx) =>
        tx.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: now } }),
      )
      .catch(() => {});

    return result;
  }

  async invalidate(keyHash: string): Promise<void> {
    await this.redis.del(`${CACHE_PREFIX}${keyHash}`);
  }
}
