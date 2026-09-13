import { z } from 'zod';

export const tenantStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_DELETION']);

export const listPlatformTenantsQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  status: tenantStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const updateTenantStatusSchema = z.strictObject({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type TenantStatus = z.infer<typeof tenantStatusSchema>;
export type ListPlatformTenantsQuery = z.infer<typeof listPlatformTenantsQuerySchema>;
export type UpdateTenantStatusInput = z.infer<typeof updateTenantStatusSchema>;
