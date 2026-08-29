import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, TransactionStatus } from '@prisma/client';
import type {
  ListTransactionsQuery,
  TransactionActionInput,
  TransactionListResponse,
  TransactionSummaryItem,
  TransactionsSummaryQuery,
  TransactionsSummaryResponse,
} from '@yallego/contracts';

import { EncryptionService } from '../../infrastructure/crypto/encryption.service';
import { PrismaService, type ScopedClient } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import {
  TransactionConfirmedEvent,
  TRANSACTION_CONFIRMED_EVENT,
} from '../../shared/events/transaction-confirmed.event';
import {
  TransactionDisputedEvent,
  TRANSACTION_DISPUTED_EVENT,
} from '../../shared/events/transaction-disputed.event';
import type { TenantResourceContext } from '../../shared/guards/tenant.guard';
import { decodeCursor, encodeCursor } from './cursor.util';

const CONFIRMABLE_STATUSES: TransactionStatus[] = [TransactionStatus.CAPTURED];
const DISPUTABLE_STATUSES: TransactionStatus[] = [
  TransactionStatus.CAPTURED,
  TransactionStatus.CONFIRMED,
];

/** Quien confirma o disputa: un usuario del panel, o una integración autenticada por API key. */
export type TransactionActor =
  { type: 'user'; userId: string } | { type: 'api_key'; apiKeyId: string };

type TransactionRow = Prisma.TransactionGetPayload<{ include: { wallet: true; device: true } }>;

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EncryptionService) private readonly cipher: EncryptionService,
    @Inject(EventEmitter2) private readonly events: EventEmitter2,
  ) {}

  async list(
    tenant: TenantResourceContext,
    query: ListTransactionsQuery,
  ): Promise<TransactionListResponse> {
    return this.prisma.withTenant(tenant.id, async (tx) => {
      const where = await this.buildWhere(tx, tenant.id, query);
      const rows = await tx.transaction.findMany({
        where,
        include: { wallet: true, device: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      });

      const hasMore = rows.length > query.limit;
      const page = hasMore ? rows.slice(0, query.limit) : rows;
      const last = page.at(-1);

      return {
        data: page.map((row) => this.toSummary(row)),
        pagination: {
          has_more: hasMore,
          next_cursor:
            hasMore && last ? encodeCursor({ occurredAt: last.occurredAt, id: last.id }) : null,
          limit: query.limit,
        },
      };
    });
  }

  async getById(
    tenant: TenantResourceContext,
    transactionId: string,
  ): Promise<TransactionSummaryItem> {
    return this.getByIdForTenant(tenant.id, transactionId);
  }

  /** Variante sin `TenantResourceContext` completo: la usan consumidores internos (p. ej. el listener de webhooks) que solo conocen el `tenantId` del evento. */
  async getByIdForTenant(tenantId: string, transactionId: string): Promise<TransactionSummaryItem> {
    const row = await this.prisma.withTenant(tenantId, (tx) =>
      tx.transaction.findUnique({
        where: { id: transactionId },
        include: { wallet: true, device: true },
      }),
    );
    if (!row || row.tenantId !== tenantId) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La transacción no existe.');
    }
    return this.toSummary(row);
  }

  async confirm(
    tenant: TenantResourceContext,
    actor: TransactionActor,
    transactionId: string,
    input: TransactionActionInput,
  ): Promise<TransactionSummaryItem> {
    const result = await this.transition(tenant, transactionId, {
      allowedFrom: CONFIRMABLE_STATUSES,
      apply: (tx, existing) =>
        tx.transaction.update({
          where: { id: existing.id },
          data: {
            status: TransactionStatus.CONFIRMED,
            confirmedAt: new Date(),
            // Sin usuario humano cuando confirma una integración por API key.
            confirmedBy: actor.type === 'user' ? actor.userId : null,
            ...(input.note !== undefined ? { note: input.note } : {}),
          },
          include: { wallet: true, device: true },
        }),
      auditAction: 'transactions.confirmed',
      actor,
      conflictMessage: 'Solo una transacción capturada puede confirmarse.',
    });

    this.events.emit(
      TRANSACTION_CONFIRMED_EVENT,
      new TransactionConfirmedEvent(
        tenant.id,
        result.id,
        actor.type === 'user' ? actor.userId : null,
        new Date(result.confirmed_at!),
      ),
    );

    return result;
  }

  async dispute(
    tenant: TenantResourceContext,
    actor: TransactionActor,
    transactionId: string,
    input: TransactionActionInput,
  ): Promise<TransactionSummaryItem> {
    const result = await this.transition(tenant, transactionId, {
      allowedFrom: DISPUTABLE_STATUSES,
      apply: (tx, existing) =>
        tx.transaction.update({
          where: { id: existing.id },
          data: {
            status: TransactionStatus.DISPUTED,
            ...(input.note !== undefined ? { note: input.note } : {}),
          },
          include: { wallet: true, device: true },
        }),
      auditAction: 'transactions.disputed',
      actor,
      conflictMessage: 'Una transacción anulada o ya disputada no puede volver a disputarse.',
    });

    this.events.emit(
      TRANSACTION_DISPUTED_EVENT,
      new TransactionDisputedEvent(tenant.id, result.id, new Date()),
    );

    return result;
  }

  async summary(
    tenant: TenantResourceContext,
    query: TransactionsSummaryQuery,
  ): Promise<TransactionsSummaryResponse> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 13 * 24 * 60 * 60 * 1_000);

    return this.prisma.withTenant(tenant.id, async (tx) => {
      const [totals, byWallet, byDay] = await Promise.all([
        tx.transaction.aggregate({
          where: { tenantId: tenant.id, occurredAt: { gte: from, lte: to } },
          _count: true,
          _sum: { amount: true },
        }),
        tx.transaction.groupBy({
          by: ['walletId'],
          where: { tenantId: tenant.id, occurredAt: { gte: from, lte: to } },
          _count: true,
          _sum: { amount: true },
        }),
        tx.$queryRaw<Array<{ date: Date; count: bigint; amount: Prisma.Decimal }>>`
          SELECT date_trunc('day', occurred_at) AS date, count(*) AS count, coalesce(sum(amount), 0) AS amount
          FROM transactions
          WHERE tenant_id = ${tenant.id}::uuid AND occurred_at BETWEEN ${from} AND ${to}
          GROUP BY 1
          ORDER BY 1
        `,
      ]);

      const wallets = byWallet.length
        ? await tx.wallet.findMany({ where: { id: { in: byWallet.map((w) => w.walletId) } } })
        : [];
      const walletCodeById = new Map(wallets.map((w) => [w.id, w.code]));

      const count = totals._count;
      const amount = totals._sum.amount ?? new Prisma.Decimal(0);
      const average = count > 0 ? amount.dividedBy(count) : new Prisma.Decimal(0);

      return {
        period: { from: from.toISOString(), to: to.toISOString() },
        totals: {
          count,
          amount: amount.toFixed(2),
          currency: 'PEN',
          average: average.toFixed(2),
        },
        by_wallet: byWallet.map((row) => ({
          wallet_code: walletCodeById.get(row.walletId) ?? row.walletId,
          count: row._count,
          amount: (row._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        })),
        by_day: byDay.map((row) => ({
          date: row.date.toISOString().slice(0, 10),
          count: Number(row.count),
          amount: row.amount.toFixed(2),
        })),
      };
    });
  }

  async exportCsv(tenant: TenantResourceContext, query: ListTransactionsQuery): Promise<string> {
    const rows = await this.prisma.withTenant(tenant.id, async (tx) => {
      const where = await this.buildWhere(tx, tenant.id, query);
      return tx.transaction.findMany({
        where,
        include: { wallet: true, device: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 10_000,
      });
    });

    const header = [
      'id',
      'billetera',
      'remitente',
      'monto',
      'moneda',
      'codigo_seguridad',
      'estado',
      'ocurrio_en',
      'dispositivo',
    ];
    const lines = rows.map((row) => {
      const summary = this.toSummary(row);
      return [
        summary.id,
        summary.wallet.display_name,
        summary.sender_name ?? '',
        summary.amount,
        summary.currency,
        summary.security_code ?? '',
        summary.status,
        summary.occurred_at,
        summary.device.label,
      ]
        .map(csvField)
        .join(',');
    });

    return [header.join(','), ...lines].join('\n');
  }

  private async transition(
    tenant: TenantResourceContext,
    transactionId: string,
    options: {
      allowedFrom: TransactionStatus[];
      apply: (
        tx: ScopedClient,
        existing: { id: string; status: TransactionStatus },
      ) => Promise<TransactionRow>;
      auditAction: string;
      actor: TransactionActor;
      conflictMessage: string;
    },
  ): Promise<TransactionSummaryItem> {
    const updated = await this.prisma.withTenant(tenant.id, async (tx) => {
      const existing = await tx.transaction.findUnique({ where: { id: transactionId } });
      if (!existing || existing.tenantId !== tenant.id) {
        throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La transacción no existe.');
      }
      if (!options.allowedFrom.includes(existing.status)) {
        throw new ApiHttpException(HttpStatus.CONFLICT, 'CONFLICT', options.conflictMessage);
      }

      const result = await options.apply(tx, existing);
      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: options.auditAction,
          actorType: options.actor.type === 'user' ? 'USER' : 'API_KEY',
          actorUserId: options.actor.type === 'user' ? options.actor.userId : undefined,
          actorApiKeyId: options.actor.type === 'api_key' ? options.actor.apiKeyId : undefined,
          resourceType: 'transaction',
          resourceId: transactionId,
        },
      });
      return result;
    });

    return this.toSummary(updated);
  }

  private async buildWhere(
    tx: ScopedClient,
    tenantId: string,
    query: ListTransactionsQuery,
  ): Promise<Prisma.TransactionWhereInput> {
    const where: Prisma.TransactionWhereInput = { tenantId };

    if (query.from || query.to) {
      where.occurredAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query.wallet_code) {
      const wallet = await tx.wallet.findUnique({ where: { code: query.wallet_code } });
      // UUID nulo: sintácticamente válido, garantiza cero resultados si el
      // código de billetera no existe (evita un error de tipo en Postgres).
      where.walletId = wallet?.id ?? '00000000-0000-0000-0000-000000000000';
    }
    if (query.device_id) where.deviceId = query.device_id;
    if (query.status) where.status = query.status;
    if (query.min_amount !== undefined || query.max_amount !== undefined) {
      where.amount = {
        ...(query.min_amount !== undefined ? { gte: query.min_amount } : {}),
        ...(query.max_amount !== undefined ? { lte: query.max_amount } : {}),
      };
    }
    if (query.search) {
      where.senderNameSearch = { contains: this.cipher.buildSearchColumn(query.search) };
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      if (!cursor) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'El cursor de paginación no es válido.',
        );
      }
      const currentOccurredAt =
        typeof where.occurredAt === 'object' &&
        where.occurredAt !== null &&
        !(where.occurredAt instanceof Date)
          ? where.occurredAt
          : {};
      const currentUpperBound = currentOccurredAt.lte;

      // Mantiene una cota de fecha indexable. La forma equivalente con OR
      // obliga a PostgreSQL a recorrer desde el inicio del índice hasta un
      // cursor profundo antes de poder devolver la página siguiente.
      where.occurredAt = {
        ...currentOccurredAt,
        lte:
          currentUpperBound instanceof Date && currentUpperBound < cursor.occurredAt
            ? currentUpperBound
            : cursor.occurredAt,
      };
      where.NOT = {
        occurredAt: cursor.occurredAt,
        id: { gte: cursor.id },
      };
    }

    return where;
  }

  private toSummary(row: TransactionRow): TransactionSummaryItem {
    return {
      id: row.id,
      wallet: { code: row.wallet.code, display_name: row.wallet.displayName },
      sender_name: row.senderNameEncrypted ? this.cipher.decrypt(row.senderNameEncrypted) : null,
      amount: row.amount.toFixed(2),
      currency: row.currency,
      security_code: row.securityCode,
      approval_code: row.approvalCode,
      status: row.status,
      occurred_at: row.occurredAt.toISOString(),
      confirmed_at: row.confirmedAt?.toISOString() ?? null,
      confirmed_by: row.confirmedBy,
      device: { id: row.device.id, label: row.device.label },
    };
  }
}

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
