import { randomBytes } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  ApiKeyCreated,
  ApiKeyScope,
  ApiKeySummary,
  CreateApiKeyInput,
} from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { TokenService } from '../auth/token.service';
import { ApiKeyVerifier } from './api-key-verifier';

const KEY_ENV = 'live';

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(ApiKeyVerifier) private readonly verifier: ApiKeyVerifier,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
  ) {}

  async list(tenant: TenantContext): Promise<ApiKeySummary[]> {
    const keys = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.apiKey.findMany({
        where: { tenantId: tenant.id, revokedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return keys.map(toSummary);
  }

  async create(
    tenant: TenantContext,
    actorUserId: string,
    input: CreateApiKeyInput,
  ): Promise<ApiKeyCreated> {
    await this.assertWithinKeyLimit(tenant.id);

    const rawSuffix = randomBytes(16).toString('hex');
    const key = `yk_${KEY_ENV}_${rawSuffix}`;
    const keyPrefix = key.slice(0, 16);
    const keyHash = this.tokenService.hashOpaqueToken(key);

    const created = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.apiKey.create({
        data: {
          tenantId: tenant.id,
          label: input.label,
          keyPrefix,
          keyHash,
          scopes: input.scopes,
          expiresAt: input.expires_at ? new Date(input.expires_at) : null,
          createdBy: actorUserId,
        },
      }),
    );

    await this.prisma.withTenant(tenant.id, (tx) =>
      tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'api_keys.created',
          actorType: 'USER',
          actorUserId,
          resourceType: 'api_key',
          resourceId: created.id,
          metadata: { label: input.label, scopes: input.scopes },
        },
      }),
    );

    return { ...toSummary(created), key };
  }

  async revoke(tenant: TenantContext, actorUserId: string, apiKeyId: string): Promise<void> {
    await this.prisma.withTenant(tenant.id, async (tx) => {
      const existing = await tx.apiKey.findUnique({ where: { id: apiKeyId } });
      if (!existing || existing.tenantId !== tenant.id || existing.revokedAt) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La clave de API no existe.');
      }

      await tx.apiKey.update({ where: { id: apiKeyId }, data: { revokedAt: new Date() } });
      await this.verifier.invalidate(existing.keyHash);
      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'api_keys.revoked',
          actorType: 'USER',
          actorUserId,
          resourceType: 'api_key',
          resourceId: apiKeyId,
        },
      });
    });
  }

  private async assertWithinKeyLimit(tenantId: string): Promise<void> {
    // El catálogo de planes no define un límite propio de claves de API: se
    // acota con el mismo límite que "integraciones" (webhooks) del plan,
    // ya que ambas son formas de integración externa.
    const currentCount = await this.prisma.withoutTenantScope((tx) =>
      tx.apiKey.count({ where: { tenantId, revokedAt: null } }),
    );
    await this.planLimits.assertWithinLimit(
      tenantId,
      'webhooks',
      currentCount,
      'Se alcanzó el límite de integraciones del plan actual.',
    );
  }
}

function toSummary(key: {
  id: string;
  label: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}): ApiKeySummary {
  return {
    id: key.id,
    label: key.label,
    key_prefix: key.keyPrefix,
    scopes: key.scopes as ApiKeyScope[],
    last_used_at: key.lastUsedAt?.toISOString() ?? null,
    expires_at: key.expiresAt?.toISOString() ?? null,
    created_at: key.createdAt.toISOString(),
  };
}
