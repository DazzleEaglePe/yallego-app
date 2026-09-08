import { can, type MembershipRole, type TenantPermission } from '@yallego/contracts';

import type { DashboardIconName } from '@/features/dashboard/dashboard-icon';

export type DashboardNavigationItem = {
  icon: DashboardIconName;
  label: string;
  href: string | null;
  permission?: TenantPermission;
  section: 'Operación' | 'Configuración' | 'Administración';
};

export const dashboardNavigation = [
  { icon: 'home', label: 'Inicio', href: '/inicio', section: 'Operación' },
  { icon: 'receipt', label: 'Transacciones', href: '/transacciones', section: 'Operación' },
  {
    icon: 'device',
    label: 'Dispositivos',
    href: '/dispositivos',
    permission: 'devices:manage',
    section: 'Configuración',
  },
  {
    icon: 'wallet',
    label: 'Billeteras',
    href: '/billeteras',
    permission: 'wallets:manage',
    section: 'Configuración',
  },
  {
    icon: 'team',
    label: 'Equipo',
    href: '/equipo',
    permission: 'members:manage',
    section: 'Administración',
  },
  {
    icon: 'plug',
    label: 'Integraciones',
    href: '/integraciones/claves-api',
    permission: 'api-keys:manage',
    section: 'Administración',
  },
  {
    icon: 'ticket',
    label: 'Membresía',
    href: '/membresia',
    permission: 'subscription:manage',
    section: 'Administración',
  },
  {
    icon: 'shield',
    label: 'Auditoría',
    href: '/auditoria',
    permission: 'audit:view',
    section: 'Administración',
  },
] satisfies DashboardNavigationItem[];

export function getVisibleNavigation(role: MembershipRole | undefined): DashboardNavigationItem[] {
  return dashboardNavigation.filter(
    (item) => item.permission === undefined || (role !== undefined && can(role, item.permission)),
  );
}
