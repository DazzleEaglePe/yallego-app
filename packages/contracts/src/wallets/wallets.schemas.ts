import { z } from 'zod';

export const activateWalletSchema = z.strictObject({
  wallet_code: z.string().trim().min(2).max(64),
  account_reference: z.string().trim().max(120).optional(),
});

export const updateWalletSchema = z
  .strictObject({
    is_enabled: z.boolean().optional(),
    account_reference: z.string().trim().max(120).nullable().optional(),
  })
  .refine((value) => value.is_enabled !== undefined || value.account_reference !== undefined, {
    message: 'Indica al menos un campo para actualizar.',
  });

export type ActivateWalletInput = z.infer<typeof activateWalletSchema>;
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>;
