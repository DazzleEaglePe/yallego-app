'use client';

import { useQuery } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { fetchInvitations, fetchMembers } from '../api/team';

export const teamQueryKeys = {
  invitations: ['team', 'invitations'] as const,
  members: ['team', 'members'] as const,
};

export function useTeamMembers() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: teamQueryKeys.members,
    queryFn: () => fetchMembers(accessToken!),
    enabled: Boolean(accessToken),
  });
}

export function useTeamInvitations(enabled: boolean) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  return useQuery({
    queryKey: teamQueryKeys.invitations,
    queryFn: () => fetchInvitations(accessToken!),
    enabled: Boolean(accessToken) && enabled,
  });
}
