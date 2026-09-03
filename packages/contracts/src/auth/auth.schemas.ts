import { z } from 'zod';

const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email('Ingresa un correo electrónico válido.').max(254),
);

const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(128, 'La contraseña no puede superar los 128 caracteres.');

export const registerSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().trim().min(2).max(200),
  business_name: z.string().trim().min(2).max(200),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Ingresa tu contraseña.').max(128),
});

export const refreshSchema = z.strictObject({
  refresh_token: z.string().min(32).optional(),
  tenant_id: z.uuid('Indica el negocio que deseas mantener activo.').optional(),
});

export const verifyEmailSchema = z.strictObject({
  token: z.string().min(32),
});

export const forgotPasswordSchema = z.strictObject({
  email: emailSchema,
});

export const resetPasswordSchema = z.strictObject({
  token: z.string().min(32),
  password: passwordSchema,
});

export const changePasswordSchema = z.strictObject({
  current_password: z.string().min(1).max(128),
  new_password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
