import { z } from 'zod';

import { assignableRoleSchema } from '../common/roles.js';

const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email('Ingresa un correo electrónico válido.').max(254),
);

const passwordSchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .max(128, 'La contraseña no puede superar los 128 caracteres.');

export const inviteMemberSchema = z.strictObject({
  email: emailSchema,
  role: assignableRoleSchema,
});

export const updateMemberRoleSchema = z.strictObject({
  role: assignableRoleSchema,
});

export const transferOwnershipSchema = z.strictObject({
  member_id: z.uuid('Indica el miembro que recibirá la propiedad.'),
});

export const acceptInvitationSchema = z.strictObject({
  token: z.string().min(32),
  full_name: z.string().trim().min(2).max(200).optional(),
  password: passwordSchema.optional(),
});

export const switchTenantSchema = z.strictObject({
  tenant_id: z.uuid('Indica el negocio al que deseas cambiar.'),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type SwitchTenantInput = z.infer<typeof switchTenantSchema>;
