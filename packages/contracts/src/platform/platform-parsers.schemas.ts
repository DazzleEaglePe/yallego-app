import { z } from 'zod';

export const parserRuleSchema = z.strictObject({
  pattern: z.string().trim().min(1),
  flags: z.string().trim().max(8).optional(),
  matchTitle: z.boolean().optional(),
});

export const createParserVersionSchema = z.strictObject({
  rules: z.array(parserRuleSchema).min(1),
  notes: z.string().trim().max(500).optional(),
});

export const testParserVersionSchema = z
  .strictObject({
    raw_notification_ids: z.array(z.uuid()).max(50).optional(),
    custom_samples: z
      .array(
        z.strictObject({
          title: z.string().nullable().optional(),
          text: z.string().nullable().optional(),
        }),
      )
      .max(50)
      .optional(),
  })
  .refine(
    (value) => (value.raw_notification_ids?.length ?? 0) + (value.custom_samples?.length ?? 0) > 0,
    {
      message: 'Indica al menos una notificación real o una muestra manual para probar.',
    },
  );

export const listUnmatchedNotificationsQuerySchema = z.object({
  wallet_code: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const reprocessNotificationsSchema = z.strictObject({
  raw_notification_ids: z.array(z.uuid()).min(1).max(100),
});

export type ParserRuleInput = z.infer<typeof parserRuleSchema>;
export type CreateParserVersionInput = z.infer<typeof createParserVersionSchema>;
export type TestParserVersionInput = z.infer<typeof testParserVersionSchema>;
export type ListUnmatchedNotificationsQuery = z.infer<typeof listUnmatchedNotificationsQuerySchema>;
export type ReprocessNotificationsInput = z.infer<typeof reprocessNotificationsSchema>;
