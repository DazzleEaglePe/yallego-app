import { z } from 'zod';

import { billingCycleSchema } from '../subscriptions/subscriptions.schemas.js';

export const registerManualPaymentSchema = z.strictObject({
  tenant_id: z.uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  method: z.string().trim().max(64).optional(),
  reference: z.string().trim().max(120).optional(),
  covers_from: z.iso.date(),
  covers_to: z.iso.date(),
  notes: z.string().trim().max(500).optional(),
});

export const applyTenantSubscriptionSchema = z.strictObject({
  plan_code: z.string().trim().min(2).max(32),
  billing_cycle: billingCycleSchema,
  reason: z.string().trim().max(500).optional(),
});

export const grantCourtesyPlanSchema = z.strictObject({
  plan_code: z.string().trim().min(2).max(32),
  billing_cycle: billingCycleSchema,
  reason: z.string().trim().min(1).max(500),
});

export type RegisterManualPaymentInput = z.infer<typeof registerManualPaymentSchema>;
export type ApplyTenantSubscriptionInput = z.infer<typeof applyTenantSubscriptionSchema>;
export type GrantCourtesyPlanInput = z.infer<typeof grantCourtesyPlanSchema>;
