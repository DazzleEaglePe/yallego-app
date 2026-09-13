import { describe, expect, it, vi } from 'vitest';

import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { PlatformTrialIdentityService } from './platform-trial-identity.service';

describe('PlatformTrialIdentityService', () => {
  it('lists claim metadata without exposing identity hashes', async () => {
    const now = new Date('2026-09-12T01:00:00.000Z');
    const tx = {
      trialIdentityClaim: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'claim-1',
            tenantId: 'tenant-1',
            kind: 'ANDROID_ID',
            status: 'CLAIMED',
            valueHash: 'must-not-leak',
            claimedAt: now,
            lastSeenAt: now,
            expiresAt: null,
          },
        ]),
      },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };
    const service = new PlatformTrialIdentityService(prisma as never);

    const result = await service.list({ tenant_id: 'tenant-1', limit: 20 });

    expect(result[0]).not.toHaveProperty('value_hash');
    expect(result[0]).not.toHaveProperty('valueHash');
    expect(result[0]).toMatchObject({ id: 'claim-1', tenant_id: 'tenant-1' });
  });

  it('overrides one claim and writes an attributable audit event', async () => {
    const tx = {
      trialIdentityClaim: {
        findUnique: vi.fn().mockResolvedValue({ id: 'claim-1', tenantId: 'tenant-1' }),
        update: vi.fn().mockResolvedValue({ id: 'claim-1', status: 'OVERRIDDEN' }),
      },
      tenant: { findUnique: vi.fn().mockResolvedValue({ id: 'tenant-2' }) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };
    const service = new PlatformTrialIdentityService(prisma as never);

    await expect(
      service.override('claim-1', 'tenant-2', 'admin-1', 'Falso positivo validado'),
    ).resolves.toEqual({
      id: 'claim-1',
      status: 'OVERRIDDEN',
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        action: 'trial.identity_claim_overridden',
        actorType: 'PLATFORM_ADMIN',
        metadata: expect.objectContaining({
          reason: 'Falso positivo validado',
          platform_admin_id: 'admin-1',
          previous_tenant_id: 'tenant-1',
          approved_tenant_id: 'tenant-2',
        }),
      }),
    });
  });

  it('does not create an audit event when the claim does not exist', async () => {
    const tx = {
      trialIdentityClaim: { findUnique: vi.fn().mockResolvedValue(null) },
      tenant: { findUnique: vi.fn() },
      auditEvent: { create: vi.fn() },
    };
    const prisma = { withoutTenantScope: vi.fn((operation) => operation(tx)) };
    const service = new PlatformTrialIdentityService(prisma as never);

    await expect(
      service.override('missing', 'tenant-2', 'admin-1', 'Revisión de soporte'),
    ).rejects.toBeInstanceOf(ApiHttpException);
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
});
