import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AuditEventListResponse,
  AuditEventSummary,
  ListAuditEventsQuery,
} from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { decodeCursor, encodeCursor } from './cursor.util';

type AuditEventRow = Prisma.AuditEventGetPayload<Record<string, never>>;

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext, query: ListAuditEventsQuery): Promise<AuditEventListResponse> {
    return this.prisma.withTenant(tenant.id, async (tx) => {
      const where = this.buildWhere(tenant.id, query);
      const rows = await tx.auditEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      });

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
    });
  }

  async exportCsv(tenant: TenantContext, query: ListAuditEventsQuery): Promise<string> {
    const rows = await this.prisma.withTenant(tenant.id, async (tx) => {
      const where = this.buildWhere(tenant.id, query);
      return tx.auditEvent.findMany({ where, orderBy: [{ createdAt: 'desc' }], take: 10_000 });
    });

    const header = [
      'id',
      'accion',
      'tipo_actor',
      'actor_usuario',
      'tipo_recurso',
      'recurso',
      'ocurrio_en',
    ];
    const lines = rows.map((row) =>
      [
        row.id,
        row.action,
        row.actorType,
        row.actorUserId ?? '',
        row.resourceType ?? '',
        row.resourceId ?? '',
        row.createdAt.toISOString(),
      ]
        .map(csvField)
        .join(','),
    );

    return [header.join(','), ...lines].join('\n');
  }

  private buildWhere(tenantId: string, query: ListAuditEventsQuery): Prisma.AuditEventWhereInput {
    const where: Prisma.AuditEventWhereInput = { tenantId };

    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.action) where.action = query.action;
    if (query.actor_user_id) where.actorUserId = query.actor_user_id;
    if (query.resource_type) where.resourceType = query.resource_type;
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      if (!cursor) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'El cursor de paginación no es válido.',
        );
      }
      where.OR = [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    }

    return where;
  }
}

function toSummary(row: AuditEventRow): AuditEventSummary {
  return {
    id: row.id,
    action: row.action,
    actor_type: row.actorType,
    actor_user_id: row.actorUserId,
    actor_api_key_id: row.actorApiKeyId,
    resource_type: row.resourceType,
    resource_id: row.resourceId,
    metadata: row.metadata as Record<string, unknown> | null,
    ip_address: row.ipAddress,
    created_at: row.createdAt.toISOString(),
  };
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
