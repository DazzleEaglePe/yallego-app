import { z } from 'zod';

export const platformLoginSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1),
  totp_code: z.string().regex(/^\d{6}$/, 'El código de verificación debe tener 6 dígitos.'),
});

export type PlatformLoginInput = z.infer<typeof platformLoginSchema>;
