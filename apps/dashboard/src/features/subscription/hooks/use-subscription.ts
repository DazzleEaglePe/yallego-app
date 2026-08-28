'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { fetchPlans, fetchSubscription } from '../api/subscription';

export const subscriptionQueryKey = ['subscription'] as const;
export const plansQueryKey = ['plans'] as const;

export function useSubscription() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: () => fetchSubscription(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function usePlans() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: plansQueryKey,
    queryFn: () => fetchPlans(accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
  });
}
