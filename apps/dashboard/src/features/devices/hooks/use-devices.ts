'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { fetchDevices } from '../api/devices';

export const devicesQueryKey = ['devices'] as const;

export function useDevices() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: devicesQueryKey,
    queryFn: () => fetchDevices(accessToken!),
    enabled: Boolean(accessToken),
    // Sin canal en tiempo real dedicado a dispositivos todavía — refresca
    // cada 30s para reflejar conectividad sin depender solo de una acción manual.
    refetchInterval: 30_000,
  });
}
