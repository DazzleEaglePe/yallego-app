import type { ReactNode } from 'react';

import { DashboardIcon, type DashboardIconName } from '@/features/dashboard/dashboard-icon';

interface EmptyStateProps {
  icon: DashboardIconName;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Readonly<EmptyStateProps>) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-14 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500">
        <DashboardIcon className="h-5 w-5" name={icon} />
      </div>
      <p className="mt-4 text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
