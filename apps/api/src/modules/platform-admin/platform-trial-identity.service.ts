import { HttpStatus, Injectable } from '@nestjs/common';
import { TrialIdentityClaimStatus } from '@prisma/client';
import type { ListTrialIdentityClaimsQuery, TrialIdentityClaimSummary } from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';

@Injectable()
export class PlatformTrialIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTrialIdentityClaimsQuery): Promise<TrialIdentityClaimSummary[]> {
    const claims = await this.prisma.withoutTenantScope((tx) =>
      tx.trialIdentityClaim.findMany({
        where: {
          ...(query.tenant_id ? { tenantId: query.tenant_id } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
        take: query.limit,
      }),
    );
    return claims.map((claim) => ({
      id: claim.id,
      tenant_id: claim.tenantId,
      kind: claim.kind,
      status: claim.status,
      claimed_at: claim.claimedAt.toISOString(),
      last_seen_at: claim.lastSeenAt.toISOString(),
      expires_at: claim.expiresAt?.toISOString() ?? null,
    }));
  }

  async override(
    claimId: string,
    targetTenantId: string,
    adminId: string,
    reason: string,
  ): Promise<{ id: string; status: 'OVERRIDDEN' }> {
    return this.prisma.withoutTenantScope(async (tx) => {
      const claim = await tx.trialIdentityClaim.findUnique({ where: { id: claimId } });
      if (!claim) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El reclamo no existe.');
      }
      const targetTenant = await tx.tenant.findUnique({
        where: { id: targetTenantId },
        select: { id: true },
      });
      if (!targetTenant) {
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'El tenant destino no existe.',
        );
      }
      const updated = await tx.trialIdentityClaim.update({
        where: { id: claimId },
        data: {
          tenantId: targetTenantId,
          status: TrialIdentityClaimStatus.OVERRIDDEN,
          metadata: {
            override_reason: reason,
            overridden_by: adminId,
            previous_tenant_id: claim.tenantId,
            approved_tenant_id: targetTenantId,
            overridden_at: new Date().toISOString(),
          },
        },
      });
      await tx.auditEvent.create({
        data: {
          tenantId: claim.tenantId,
          action: 'trial.identity_claim_overridden',
          actorType: 'PLATFORM_ADMIN',
          resourceType: 'trial_identity_claim',
          resourceId: claimId,
          metadata: {
            reason,
            platform_admin_id: adminId,
            previous_tenant_id: claim.tenantId,
            approved_tenant_id: targetTenantId,
          },
        },
      });
      return { id: updated.id, status: 'OVERRIDDEN' };
    });
  }
}
