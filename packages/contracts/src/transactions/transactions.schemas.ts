import { z } from 'zod';

const transactionStatusSchema = z.enum(['CAPTURED', 'CONFIRMED', 'DISPUTED', 'VOIDED']);

export const listTransactionsQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  wallet_code: z.string().trim().min(1).max(64).optional(),
  device_id: z.uuid().optional(),
  status: transactionStatusSchema.optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().min(1).optional(),
});

export const transactionActionSchema = z.strictObject({
  note: z.string().trim().max(500).optional(),
});

export const transactionsSummaryQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
export type TransactionActionInput = z.infer<typeof transactionActionSchema>;
export type TransactionsSummaryQuery = z.infer<typeof transactionsSummaryQuerySchema>;
