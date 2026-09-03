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
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-neutral-100 text-neutral-400">
        <DashboardIcon className="h-6 w-6" name={icon} />
      </div>
      <p className="mt-4 text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
