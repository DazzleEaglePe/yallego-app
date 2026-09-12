import { z } from 'zod';

export const createWalletCatalogEntrySchema = z.strictObject({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]+$/, 'Usa mayúsculas, dígitos y guion bajo.'),
  display_name: z.string().trim().min(2).max(120),
  provider: z.string().trim().min(1).max(32),
  issuer: z.string().trim().max(64).optional(),
  android_package: z.string().trim().min(1).max(255),
  icon_url: z.url().optional(),
});

export type CreateWalletCatalogEntryInput = z.infer<typeof createWalletCatalogEntrySchema>;
