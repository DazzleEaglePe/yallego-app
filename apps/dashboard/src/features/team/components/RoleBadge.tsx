import type { MembershipRole } from '@yallego/contracts';

const labels: Record<MembershipRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
  VIEWER: 'Solo lectura',
};

export function roleLabel(role: MembershipRole): string {
  return labels[role];
}

export function RoleBadge({ role }: Readonly<{ role: MembershipRole }>) {
  return (
    <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
      {roleLabel(role)}
    </span>
  );
}
