import type { RealtimeConnectionStatus } from '@/shared/hooks/use-realtime-socket';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';

const CONFIG: Record<
  RealtimeConnectionStatus,
  { label: string; className: string; icon: 'wifi' | 'wifi-off' }
> = {
  connected: { label: 'En vivo', className: 'bg-success-50 text-success-600', icon: 'wifi' },
  connecting: { label: 'Conectando…', className: 'bg-neutral-100 text-neutral-500', icon: 'wifi' },
  disconnected: {
    label: 'Sin conexión en vivo',
    className: 'bg-warning-50 text-warning-600',
    icon: 'wifi-off',
  },
};

export function ConnectionIndicator({ status }: Readonly<{ status: RealtimeConnectionStatus }>) {
  const config = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${config.className}`}
      role="status"
    >
      <DashboardIcon className="h-3.5 w-3.5" name={config.icon} />
      {config.label}
    </span>
  );
}
