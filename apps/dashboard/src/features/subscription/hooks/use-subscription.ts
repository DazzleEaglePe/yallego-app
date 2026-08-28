'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { fetchSubscription } from '../api/subscription';

export const subscriptionQueryKey = ['subscription'] as const;

export function useSubscription() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: () => fetchSubscription(accessToken!),
    enabled: Boolean(accessToken),
  });
}
