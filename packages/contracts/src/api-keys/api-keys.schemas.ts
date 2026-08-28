import { z } from 'zod';

export const apiKeyScopeSchema = z.enum([
  'transactions:read',
  'transactions:write',
  'devices:read',
  'webhooks:read',
  'webhooks:write',
  'realtime:subscribe',
]);

export const createApiKeySchema = z.strictObject({
  label: z.string().trim().min(2).max(120),
  scopes: z.array(apiKeyScopeSchema).min(1),
  expires_at: z.iso.datetime().nullable().optional(),
});

export type ApiKeyScope = z.infer<typeof apiKeyScopeSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
