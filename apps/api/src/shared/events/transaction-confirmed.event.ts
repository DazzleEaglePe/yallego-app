export const TRANSACTION_CONFIRMED_EVENT = 'transaction.confirmed';

export class TransactionConfirmedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly transactionId: string,
    /** Nulo cuando confirma una integración por API key, no un usuario del panel. */
    public readonly confirmedBy: string | null,
    public readonly confirmedAt: Date,
  ) {}
}
