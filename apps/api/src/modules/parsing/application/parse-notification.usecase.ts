import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ParseStatus } from '@prisma/client';
import {
  ParserRegistry,
  type NormalizedTransaction,
  type RawNotification as ParserRawNotification,
} from '@yallego/parsers';

import { EncryptionService } from '../../../infrastructure/crypto/encryption.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import {
  TransactionCreatedEvent,
  TRANSACTION_CREATED_EVENT,
} from '../../../shared/events/transaction-created.event';
import { withSpan } from '../../../shared/observability/trace';
import { UsageCounterService } from '../../plans/usage-counter.service';
import { PARSER_CONSTRUCTORS } from '../parser-constructors';
import {
  PARSER_PATTERN_REPOSITORY_PORT,
  type ParserPatternRepositoryPort,
} from '../ports/parser-pattern-repository.port';

@Injectable()
export class ParseNotificationUseCase {
  private readonly logger = new Logger(ParseNotificationUseCase.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PARSER_PATTERN_REPOSITORY_PORT)
    private readonly patternRepository: ParserPatternRepositoryPort,
    @Inject(EncryptionService) private readonly cipher: EncryptionService,
    @Inject(EventEmitter2) private readonly events: EventEmitter2,
    @Inject(UsageCounterService) private readonly usageCounter: UsageCounterService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  async execute(rawNotificationId: string): Promise<void> {
    return withSpan(
      'parsing.notification',
      { 'yallego.raw_notification_id': rawNotificationId },
      () => this.doExecute(rawNotificationId),
    );
  }

  private async doExecute(rawNotificationId: string): Promise<void> {
    const raw = await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.findUnique({ where: { id: rawNotificationId } }),
    );

    // Ausente o ya procesada: el job es idempotente ante un reintento tardío de BullMQ.
    if (!raw || raw.parseStatus !== ParseStatus.PENDING) return;

    const wallet = await this.prisma.wallet.findFirst({
      where: { androidPackage: raw.packageName },
    });
    if (!wallet) {
      this.metrics.parsingResultsTotal.inc({ wallet_code: raw.packageName, result: 'unmatched' });
      await this.markUnmatched(
        raw.id,
        'No hay una billetera registrada para este paquete de Android.',
      );
      return;
    }

    const ParserCtor = PARSER_CONSTRUCTORS[wallet.code];
    if (!ParserCtor) {
      this.metrics.parsingResultsTotal.inc({ wallet_code: wallet.code, result: 'unmatched' });
      await this.markUnmatched(raw.id, `Todavía no existe un parser para "${wallet.code}".`);
      return;
    }

    const activePatterns = await this.patternRepository.findActivePatterns(wallet.code);
    if (!activePatterns) {
      this.metrics.parsingResultsTotal.inc({ wallet_code: wallet.code, result: 'unmatched' });
      await this.markUnmatched(
        raw.id,
        `No hay patrones activos configurados para "${wallet.code}".`,
      );
      return;
    }

    const parser = new ParserCtor(activePatterns.rules);
    const registry = new ParserRegistry([parser]);
    const input: ParserRawNotification = {
      packageName: raw.packageName,
      title: raw.title,
      text: raw.body,
      postedAt: raw.postedAt,
    };

    const selected = registry.select(input);
    const result = selected?.parse(input);
    if (!result) {
      this.metrics.parsingResultsTotal.inc({ wallet_code: wallet.code, result: 'unmatched' });
      await this.markUnmatched(
        raw.id,
        'La notificación no coincide con ningún patrón activo.',
        activePatterns.patternId,
      );
      return;
    }

    this.metrics.parsingResultsTotal.inc({ wallet_code: wallet.code, result: 'parsed' });
    await this.createTransaction(
      raw.tenantId,
      raw.deviceId,
      raw.id,
      wallet.id,
      activePatterns.patternId,
      result,
    );
  }

  private async createTransaction(
    tenantId: string,
    deviceId: string,
    rawNotificationId: string,
    walletId: string,
    parserPatternId: string,
    result: NormalizedTransaction,
  ): Promise<void> {
    const senderNameEncrypted = result.senderName ? this.cipher.encrypt(result.senderName) : null;
    const senderNameSearch = result.senderName
      ? this.cipher.buildSearchColumn(result.senderName)
      : null;

    const transaction = await this.prisma.withTenant(tenantId, async (tx) => {
      const created = await tx.transaction.create({
        data: {
          tenantId,
          deviceId,
          walletId,
          rawNotificationId,
          senderNameEncrypted,
          senderNameSearch,
          amount: result.amount.value,
          currency: result.amount.currency,
          securityCode: result.securityCode,
          approvalCode: result.approvalCode,
          occurredAt: result.occurredAt,
        },
      });

      await tx.rawNotification.update({
        where: { id: rawNotificationId },
        data: { parseStatus: ParseStatus.PARSED, parserPatternId },
      });

      return created;
    });

    await this.usageCounter.incrementTransactions(tenantId);

    this.events.emit(
      TRANSACTION_CREATED_EVENT,
      new TransactionCreatedEvent(
        tenantId,
        transaction.id,
        result.walletCode,
        deviceId,
        transaction.amount.toNumber(),
        transaction.currency,
        transaction.occurredAt,
      ),
    );

    this.logger.debug(
      `Transaction ${transaction.id} created from notification ${rawNotificationId}`,
    );
  }

  private async markUnmatched(
    rawNotificationId: string,
    reason: string,
    parserPatternId?: string,
  ): Promise<void> {
    await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.update({
        where: { id: rawNotificationId },
        data: {
          parseStatus: ParseStatus.UNMATCHED,
          parseError: reason,
          ...(parserPatternId ? { parserPatternId } : {}),
        },
      }),
    );
  }
}
