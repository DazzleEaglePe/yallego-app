import { z } from 'zod';

export const billingCycleSchema = z.enum(['MONTHLY', 'SEMIANNUAL', 'ANNUAL']);

export const changeSubscriptionSchema = z.strictObject({
  plan_code: z.string().trim().min(2).max(32),
  billing_cycle: billingCycleSchema,
});

export type BillingCycle = z.infer<typeof billingCycleSchema>;
export type ChangeSubscriptionInput = z.infer<typeof changeSubscriptionSchema>;
