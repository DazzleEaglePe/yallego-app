'use client';

import { can, type DeviceSummary } from '@yallego/contracts';
import { useState } from 'react';

import { getActiveTenant, useAuthSession } from '@/features/auth/auth-session';
import { ApiRequestError } from '@/features/auth/api';
import { DashboardIcon } from '@/features/dashboard/dashboard-icon';
import { PairDeviceDialog } from '@/features/devices/components/PairDeviceDialog';
import { RevokeDeviceDialog } from '@/features/devices/components/RevokeDeviceDialog';
import { useDeviceActions } from '@/features/devices/hooks/use-device-actions';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { formatDateTime, formatElapsed } from '@/shared/lib/format';

const statusLabel: Record<DeviceSummary['status'], string> = {
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  REVOKED: 'Revocado',
};

export default function DevicesPage() {
  const { session } = useAuthSession();
  const role = getActiveTenant(session)?.role ?? 'VIEWER';
  const canManage = can(role, 'devices:manage');
  const devices = useDevices();
  const actions = useDeviceActions();
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DeviceSummary | null>(null);

  const deviceList = devices.data ?? [];
  const activeCount = deviceList.filter((device) => device.status !== 'REVOKED').length;
  const actionError = errorMessage(actions.update.error) ?? errorMessage(actions.revoke.error);

  return (
    <div className="pb-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <DashboardIcon className="h-5 w-5 text-brand-400" name="device" />
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-3xl">
              Dispositivos
            </h1>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500 sm:text-base">
            Los celulares Android que capturan los cobros de tu negocio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-neutral-500">
            <strong className="text-neutral-950">{activeCount}</strong> vinculado
            {activeCount === 1 ? '' : 's'}
          </span>
          {canManage && (
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
              onClick={() => setIsPairingOpen(true)}
              type="button"
            >
              <DashboardIcon className="h-4 w-4" name="device" />
              Vincular dispositivo
            </button>
          )}
        </div>
      </section>

      {actionError && (
        <p
          className="mt-5 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-600"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <section className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-neutral-950">Todos los dispositivos</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Estado de conexión y control de cada celular vinculado.
          </p>
        </div>

        {devices.isLoading && <DevicesSkeleton />}

        {devices.isError && (
          <LoadError
            message="No pudimos cargar los dispositivos."
            onRetry={() => void devices.refetch()}
          />
        )}

        {!devices.isLoading && !devices.isError && deviceList.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-neutral-500">
            Todavía no vinculaste ningún dispositivo. Usa &quot;Vincular dispositivo&quot; para
            empezar a recibir cobros.
          </div>
        )}

        {!devices.isLoading && !devices.isError && deviceList.length > 0 && (
          <div>
            <div className="hidden grid-cols-[minmax(220px,1fr)_170px_90px_170px_130px] gap-4 border-b border-neutral-200 bg-neutral-50 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 md:grid">
              <span>Dispositivo</span>
              <span>Conectividad</span>
              <span>Estado</span>
              <span>Acciones</span>
              <span className="text-right">Vinculación</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {deviceList.map((device) => (
                <DeviceRow
                  canManage={canManage}
                  device={device}
                  isBusy={actions.update.isPending || actions.revoke.isPending}
                  key={device.id}
                  onRevoke={() => setRevokeTarget(device)}
                  onToggleStatus={() =>
                    actions.update.mutate({
                      deviceId: device.id,
                      input: { status: device.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' },
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {isPairingOpen && session && (
        <PairDeviceDialog
          accessToken={session.accessToken}
          onClose={() => setIsPairingOpen(false)}
        />
      )}

      {revokeTarget && (
        <RevokeDeviceDialog
          deviceLabel={revokeTarget.label}
          isPending={actions.revoke.isPending}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() =>
            actions.revoke.mutate(revokeTarget.id, { onSuccess: () => setRevokeTarget(null) })
          }
        />
      )}
    </div>
  );
}

function DeviceRow({
  canManage,
  device,
  isBusy,
  onRevoke,
  onToggleStatus,
}: Readonly<{
  canManage: boolean;
  device: DeviceSummary;
  isBusy: boolean;
  onRevoke: () => void;
  onToggleStatus: () => void;
}>) {
  const isRevoked = device.status === 'REVOKED';
  const detail = [device.manufacturer, device.model].filter(Boolean).join(' ');
  const connectivityMeta = {
    DEGRADED: {
      dot: 'bg-warning-500',
      icon: 'wifi' as const,
      label: device.last_seen_at
        ? `Señal retrasada · ${formatElapsed(device.last_seen_at)}`
        : 'Señal retrasada',
      text: 'text-warning-600',
    },
    OFFLINE: {
      dot: 'bg-neutral-500',
      icon: 'wifi-off' as const,
      label: device.last_seen_at
        ? `Sin conexión · ${formatElapsed(device.last_seen_at)}`
        : 'Sin señal todavía',
      text: 'text-neutral-400',
    },
    ONLINE: {
      dot: 'bg-success-500',
      icon: 'wifi' as const,
      label: 'En línea',
      text: 'text-success-500',
    },
  }[device.connectivity];

  return (
    <div className="grid gap-3 px-5 py-4 transition hover:bg-neutral-50 sm:px-6 md:grid-cols-[minmax(220px,1fr)_170px_90px_170px_130px] md:items-center md:gap-4">
      <span className="flex min-w-0 items-center gap-3">
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500">
          <DashboardIcon className="h-4 w-4" name="device" />
          <span
            aria-hidden="true"
            className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-neutral-950 ${connectivityMeta.dot}`}
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-neutral-950">
            {device.label}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            {detail || 'Fabricante desconocido'}
            {device.app_version ? ` · v${device.app_version}` : ''}
          </span>
        </span>
      </span>

      <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
        <DashboardIcon
          className={`h-3.5 w-3.5 ${connectivityMeta.text}`}
          name={connectivityMeta.icon}
        />
        {connectivityMeta.label}
      </span>

      <span
        className={
          device.status === 'ACTIVE'
            ? 'rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600'
            : device.status === 'PAUSED'
              ? 'rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-600'
              : 'rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500'
        }
      >
        {statusLabel[device.status]}
      </span>

      <span className="flex items-center gap-1">
        {canManage && !isRevoked && (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
            disabled={isBusy}
            onClick={onToggleStatus}
            type="button"
          >
            <DashboardIcon
              className="h-3.5 w-3.5"
              name={device.status === 'ACTIVE' ? 'pause' : 'play'}
            />
            {device.status === 'ACTIVE' ? 'Pausar' : 'Reanudar'}
          </button>
        )}
        {canManage && !isRevoked && (
          <button
            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-danger-600 transition hover:bg-danger-50 disabled:opacity-50"
            disabled={isBusy}
            onClick={onRevoke}
            type="button"
          >
            Revocar
          </button>
        )}
        {(!canManage || isRevoked) && <span className="text-xs text-neutral-500">—</span>}
      </span>

      <span className="text-left text-xs text-neutral-400 md:text-right">
        Vinculado el {formatDateTime(device.paired_at)}
      </span>
    </div>
  );
}

function LoadError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-6 sm:px-6">
      <p className="text-sm text-danger-600">{message}</p>
      <button
        className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
        onClick={onRetry}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}

function DevicesSkeleton() {
  return (
    <div className="divide-y divide-neutral-100" role="status">
      {Array.from({ length: 2 }, (_, index) => (
        <div className="flex animate-pulse items-center gap-3 px-5 py-4 sm:px-6" key={index}>
          <span className="h-10 w-10 rounded-full bg-neutral-100" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-40 rounded bg-neutral-100" />
            <span className="block h-3 w-56 max-w-full rounded bg-neutral-100" />
          </span>
          <span className="h-7 w-20 rounded-full bg-neutral-100" />
        </div>
      ))}
      <span className="sr-only">Cargando dispositivos…</span>
    </div>
  );
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiRequestError) return error.message;
  return 'No pudimos completar la acción. Inténtalo nuevamente.';
}
