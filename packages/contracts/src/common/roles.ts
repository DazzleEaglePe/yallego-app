import { z } from 'zod';

export const membershipRoleSchema = z.enum(['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER']);

/** Roles que pueden asignarse a un miembro. La propiedad se traspasa, no se asigna. */
export const assignableRoleSchema = z.enum(['ADMIN', 'OPERATOR', 'VIEWER']);

export type AssignableRole = z.infer<typeof assignableRoleSchema>;
