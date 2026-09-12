import { z } from 'zod';

const notificationItemSchema = z.strictObject({
  client_ref: z.string().trim().min(1).max(120),
  package_name: z.string().trim().min(1).max(255),
  title: z.string().trim().max(500).nullable().optional(),
  body: z.string().trim().max(2_000).nullable().optional(),
  posted_at: z.iso.datetime(),
});

export const ingestNotificationsSchema = z.strictObject({
  notifications: z.array(notificationItemSchema).min(1).max(50),
});

export type IngestNotificationItemInput = z.infer<typeof notificationItemSchema>;
export type IngestNotificationsInput = z.infer<typeof ingestNotificationsSchema>;
