export const TRANSACTION_CREATED_EVENT = 'transaction.created';

/**
 * docs/04_ARQUITECTURA_SOFTWARE.md §5.1, paso 14: el gateway de tiempo real
 * (Sprint 5), el despachador de webhooks (Sprint 6) y el contador de uso
 * (Sprint 7) se suscriben a este evento. Ninguno existe todavía; este evento
 * ya se emite para que esos sprints solo necesiten agregar un listener.
 */
export class TransactionCreatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly transactionId: string,
    public readonly walletCode: string,
    public readonly deviceId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly occurredAt: Date,
  ) {}
}
