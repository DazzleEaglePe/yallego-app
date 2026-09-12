import type { MembershipRole } from '../auth/auth.types.js';

/**
 * Matriz de permisos de la sección 5.2 de `docs/07_SEGURIDAD_AUTH.md`.
 * El backend la aplica en los guards y el panel la usa para ocultar acciones.
 */
export const TENANT_PERMISSIONS = {
  'transactions:view': ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'],
  'transactions:review': ['OWNER', 'ADMIN', 'OPERATOR'],
  'data:export': ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'],
  'devices:manage': ['OWNER', 'ADMIN'],
  'wallets:manage': ['OWNER', 'ADMIN'],
  'members:manage': ['OWNER', 'ADMIN'],
  'members:assign-role': ['OWNER'],
  'api-keys:manage': ['OWNER', 'ADMIN'],
  'webhooks:manage': ['OWNER', 'ADMIN'],
  'audit:view': ['OWNER', 'ADMIN'],
  'subscription:manage': ['OWNER'],
  'tenant:edit': ['OWNER', 'ADMIN'],
  'tenant:delete': ['OWNER'],
} as const satisfies Record<string, readonly MembershipRole[]>;

export type TenantPermission = keyof typeof TENANT_PERMISSIONS;

/** Jerarquía de roles: un rol satisface el requisito de cualquier rol de menor rango. */
export const ROLE_RANK: Record<MembershipRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

export function can(role: MembershipRole, permission: TenantPermission): boolean {
  return (TENANT_PERMISSIONS[permission] as readonly MembershipRole[]).includes(role);
}

export function satisfiesRole(role: MembershipRole, required: MembershipRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}
