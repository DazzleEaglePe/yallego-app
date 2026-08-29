import { can, type MembershipRole, type TenantPermission } from '@yallego/contracts';

import type { DashboardIconName } from '@/features/dashboard/dashboard-icon';

export type DashboardNavigationItem = {
  icon: DashboardIconName;
  label: string;
  href: string | null;
  permission?: TenantPermission;
};

export const dashboardNavigation = [
  { icon: 'home', label: 'Inicio', href: '/inicio' },
  { icon: 'receipt', label: 'Transacciones', href: '/transacciones' },
  { icon: 'device', label: 'Dispositivos', href: null, permission: 'devices:manage' },
  { icon: 'wallet', label: 'Billeteras', href: null, permission: 'wallets:manage' },
  { icon: 'team', label: 'Equipo', href: '/equipo', permission: 'members:manage' },
  {
    icon: 'plug',
    label: 'Integraciones',
    href: '/integraciones/claves-api',
    permission: 'api-keys:manage',
  },
  {
    icon: 'ticket',
    label: 'Membresía',
    href: '/membresia',
    permission: 'subscription:manage',
  },
  {
    icon: 'shield',
    label: 'Auditoría',
    href: '/auditoria',
    permission: 'audit:view',
  },
] satisfies DashboardNavigationItem[];

export function getVisibleNavigation(role: MembershipRole | undefined): DashboardNavigationItem[] {
  return dashboardNavigation.filter(
    (item) => item.permission === undefined || (role !== undefined && can(role, item.permission)),
  );
}
