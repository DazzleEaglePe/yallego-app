import type { DeviceConnectivity } from '@yallego/contracts';

export const DEVICE_ONLINE_THRESHOLD_MS = 3 * 60 * 1_000;
// El umbral coincide con el comunicado que ve el negocio: no elevamos una
// desconexión transitoria a incidente hasta que pasan 15 minutos.
export const DEVICE_OFFLINE_THRESHOLD_MS = 15 * 60 * 1_000;

export function getDeviceConnectivity(
  lastSeenAt: Date | null,
  nowMs = Date.now(),
): DeviceConnectivity {
  if (!lastSeenAt) return 'OFFLINE';

  const elapsedMs = Math.max(0, nowMs - lastSeenAt.getTime());
  if (elapsedMs < DEVICE_ONLINE_THRESHOLD_MS) return 'ONLINE';
  if (elapsedMs < DEVICE_OFFLINE_THRESHOLD_MS) return 'DEGRADED';
  return 'OFFLINE';
}
