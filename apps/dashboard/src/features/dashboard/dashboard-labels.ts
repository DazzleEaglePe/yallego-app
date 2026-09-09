import type { MembershipRole } from '@yallego/contracts';

export function formatRoleLabel(role: MembershipRole | undefined): string {
  if (role === 'OWNER') return 'Propietario';
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'OPERATOR') return 'Operador';
  if (role === 'VIEWER') return 'Solo lectura';
  return 'Cuenta principal';
}

export function getInitials(value?: string): string {
  if (!value?.trim()) return 'YL';

  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
