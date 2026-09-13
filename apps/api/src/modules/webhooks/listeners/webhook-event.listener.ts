import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { TransactionsService } from '../../transactions/transactions.service';
import {
  TransactionConfirmedEvent,
  TRANSACTION_CONFIRMED_EVENT,
} from '../../../shared/events/transaction-confirmed.event';
import {
  TransactionCreatedEvent,
  TRANSACTION_CREATED_EVENT,
} from '../../../shared/events/transaction-created.event';
import {
  TransactionDisputedEvent,
  TRANSACTION_DISPUTED_EVENT,
} from '../../../shared/events/transaction-disputed.event';
import { WebhookDispatchService } from '../dispatch/webhook-dispatch.service';

/**
 * Traduce los eventos de dominio ya emitidos por otros módulos (Sprint 5) a
 * despachos de webhook (Sprint 6, docs/06_API_CONTRACT.md §9.3). Solo cubre
 * `transaction.*`: `device.offline`/`device.online`/`notification.unmatched`
 * no se emiten todavía en ningún módulo — pendiente, ver docs/10.
 */
@Injectable()
export class WebhookEventListener {
  private readonly logger = new Logger(WebhookEventListener.name);

  constructor(
    @Inject(TransactionsService) private readonly transactions: TransactionsService,
    @Inject(WebhookDispatchService) private readonly dispatch: WebhookDispatchService,
  ) {}

  @OnEvent(TRANSACTION_CREATED_EVENT)
  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    await this.dispatchTransaction(event.tenantId, event.transactionId, 'transaction.created');
  }

  @OnEvent(TRANSACTION_CONFIRMED_EVENT)
  async handleTransactionConfirmed(event: TransactionConfirmedEvent): Promise<void> {
    await this.dispatchTransaction(event.tenantId, event.transactionId, 'transaction.confirmed');
  }

  @OnEvent(TRANSACTION_DISPUTED_EVENT)
  async handleTransactionDisputed(event: TransactionDisputedEvent): Promise<void> {
    await this.dispatchTransaction(event.tenantId, event.transactionId, 'transaction.disputed');
  }

  private async dispatchTransaction(
    tenantId: string,
    transactionId: string,
    eventType: 'transaction.created' | 'transaction.confirmed' | 'transaction.disputed',
  ): Promise<void> {
    try {
      const transaction = await this.transactions.getByIdForTenant(tenantId, transactionId);
      await this.dispatch.enqueueForEvent(tenantId, eventType, { transaction });
    } catch (error) {
      // No debe tumbar el flujo que originó el evento (confirmar/disputar ya
      // ocurrió y se persistió); un fallo aquí solo significa que ningún
      // webhook se encoló para este evento puntual.
      this.logger.error(
        `Failed to dispatch ${eventType} webhooks for transaction ${transactionId}: ${String(error)}`,
      );
    }
  }
}
