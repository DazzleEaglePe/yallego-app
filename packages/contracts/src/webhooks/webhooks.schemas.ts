import { z } from 'zod';

export const webhookEventTypeSchema = z.enum([
  'transaction.created',
  'transaction.confirmed',
  'transaction.disputed',
  'device.offline',
  'device.online',
  'notification.unmatched',
]);

export const registerWebhookSchema = z.strictObject({
  // Solo valida la forma. HTTPS y la prevención de SSRF (resolución de DNS,
  // rangos de IP privados) requieren trabajo asíncrono y viven en el backend.
  url: z.url().refine((value) => value.startsWith('https://'), {
    message: 'La URL del webhook debe usar HTTPS.',
  }),
  subscribed_events: z.array(webhookEventTypeSchema).min(1),
  description: z.string().trim().max(500).optional(),
});

export const updateWebhookSchema = z
  .strictObject({
    subscribed_events: z.array(webhookEventTypeSchema).min(1).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    is_enabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Indica al menos un campo para actualizar.',
  });

export const deliveryStatusSchema = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'DELIVERED',
  'FAILED',
  'ABANDONED',
]);

export const listWebhookDeliveriesQuerySchema = z.object({
  status: deliveryStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type WebhookEventType = z.infer<typeof webhookEventTypeSchema>;
export type RegisterWebhookInput = z.infer<typeof registerWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type ListWebhookDeliveriesQuery = z.infer<typeof listWebhookDeliveriesQuerySchema>;
