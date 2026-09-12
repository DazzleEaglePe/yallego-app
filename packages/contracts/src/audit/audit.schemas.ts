import { z } from 'zod';

export const listAuditEventsQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  action: z.string().trim().min(1).max(128).optional(),
  actor_user_id: z.uuid().optional(),
  resource_type: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type ListAuditEventsQuery = z.infer<typeof listAuditEventsQuerySchema>;
