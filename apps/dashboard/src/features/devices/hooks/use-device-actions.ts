'use client';

import type { UpdateDeviceInput } from '@yallego/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { revokeDevice, updateDevice } from '../api/devices';
import { devicesQueryKey } from './use-devices';

export function useDeviceActions() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();

  const refreshDevices = () => queryClient.invalidateQueries({ queryKey: devicesQueryKey });

  const update = useMutation({
    mutationFn: ({ deviceId, input }: { deviceId: string; input: UpdateDeviceInput }) =>
      updateDevice(accessToken, deviceId, input),
    onSuccess: refreshDevices,
  });

  const revoke = useMutation({
    mutationFn: (deviceId: string) => revokeDevice(accessToken, deviceId),
    onSuccess: refreshDevices,
  });

  return { revoke, update };
}
