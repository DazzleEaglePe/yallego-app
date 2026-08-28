import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MembershipRole, Prisma } from '@prisma/client';
import type {
  ListPlatformTenantsQuery,
  PlatformTenantDetail,
  PlatformTenantListResponse,
  PlatformTenantSummary,
  UpdateTenantStatusInput,
} from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { decodeCursor, encodeCursor } from './tenant-cursor.util';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60_000;

/**
 * "Acceso a datos de tenant únicamente mediante procedimientos explícitos y
 * registrados" (docs/07 §11): cada consulta pasa por `withoutTenantScope`
 * (nunca hay un `app.tenant_id` propio de un administrador de plataforma) y
 * cada acción de escritura queda en `audit_events` con el administrador
 * como actor.
 */
@Injectable()
export class PlatformTenantsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(query: ListPlatformTenantsQuery): Promise<PlatformTenantListResponse> {
    const where: Prisma.TenantWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { businessName: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      if (!cursor)
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'El cursor de paginación no es válido.',
        );
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        },
      ];
    }

    const rows = await this.prisma.withoutTenantScope((tx) =>
      tx.tenant.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        include: {
          memberships: { select: { id: true } },
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { periodStart: 'desc' },
            include: { plan: true },
          },
        },
      }),
    );

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      data: page.map(toSummary),
      pagination: {
        has_more: hasMore,
        next_cursor:
          hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
        limit: query.limit,
      },
    };
  }

  async getById(tenantId: string): Promise<PlatformTenantDetail> {
    const tenant = await this.prisma.withoutTenantScope((tx) =>
      tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          memberships: { include: { user: true } },
          subscriptions: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { periodStart: 'desc' },
            include: { plan: true },
          },
          devices: { select: { id: true } },
        },
      }),
    );
    if (!tenant)
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El negocio no existe.');

    const transactionsLast30Days = await this.prisma.withoutTenantScope((tx) =>
      tx.transaction.count({
        where: { tenantId, occurredAt: { gte: new Date(Date.now() - THIRTY_DAYS_MS) } },
      }),
    );

    const owner = tenant.memberships.find((membership) => membership.role === MembershipRole.OWNER);

    return {
      ...toSummary(tenant),
      legal_name: tenant.legalName,
      tax_id: tenant.taxId,
      country: tenant.country,
      owner_email: owner?.user.email ?? null,
      device_count: tenant.devices.length,
      transactions_last_30_days: transactionsLast30Days,
    };
  }

  async updateStatus(
    tenantId: string,
    platformAdminId: string,
    input: UpdateTenantStatusInput,
  ): Promise<PlatformTenantSummary> {
    const tenantInclude = {
      subscriptions: {
        where: { status: 'ACTIVE' as const },
        take: 1,
        orderBy: { periodStart: 'desc' as const },
        include: { plan: true },
      },
      memberships: { select: { id: true } },
    } satisfies Prisma.TenantInclude;

    const updated = await this.prisma.withoutTenantScope(async (tx) => {
      const existing = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: tenantInclude,
      });
      if (!existing)
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'El negocio no existe.');
      if (existing.status === input.status) return existing;

      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { status: input.status },
        include: tenantInclude,
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          action:
            input.status === 'SUSPENDED'
              ? 'platform.tenant_suspended'
              : 'platform.tenant_activated',
          actorType: 'PLATFORM_ADMIN',
          actorPlatformAdminId: platformAdminId,
          resourceType: 'tenant',
          resourceId: tenantId,
          metadata: input.reason ? { reason: input.reason } : undefined,
        },
      });

      return tenant;
    });

    return toSummary(updated);
  }
}

type TenantRow = Prisma.TenantGetPayload<{
  include: {
    memberships: { select: { id: true } };
    subscriptions: { include: { plan: true } };
  };
}>;

function toSummary(tenant: TenantRow): PlatformTenantSummary {
  return {
    id: tenant.id,
    slug: tenant.slug,
    business_name: tenant.businessName,
    status: tenant.status,
    plan_code: tenant.subscriptions[0]?.plan.code ?? null,
    member_count: tenant.memberships.length,
    created_at: tenant.createdAt.toISOString(),
  };
}
