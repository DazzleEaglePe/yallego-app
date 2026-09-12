export const TRANSACTION_DISPUTED_EVENT = 'transaction.disputed';

export class TransactionDisputedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly transactionId: string,
    public readonly disputedAt: Date,
  ) {}
}
