import type { DeviceSummary, PairingCodeResponse, UpdateDeviceInput } from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function fetchDevices(accessToken: string): Promise<DeviceSummary[]> {
  return authenticatedRequest<DeviceSummary[]>('/devices', accessToken);
}

export function createPairingCode(accessToken: string): Promise<PairingCodeResponse> {
  return authenticatedRequest<PairingCodeResponse>('/devices/pairing-codes', accessToken, {
    body: JSON.stringify({ label: 'Android de cobros' }),
    method: 'POST',
  });
}

export function updateDevice(
  accessToken: string,
  deviceId: string,
  input: UpdateDeviceInput,
): Promise<DeviceSummary> {
  return authenticatedRequest<DeviceSummary>(`/devices/${deviceId}`, accessToken, {
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export function revokeDevice(accessToken: string, deviceId: string): Promise<void> {
  return authenticatedRequest<void>(`/devices/${deviceId}`, accessToken, { method: 'DELETE' });
}
