import type { ReactNode } from 'react';

import { SessionGuard } from '@/features/auth/session-guard';
import { DashboardShell } from '@/features/dashboard/dashboard-shell';

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SessionGuard>
      <DashboardShell>{children}</DashboardShell>
    </SessionGuard>
  );
}
