'use client';

import type { InviteMemberInput, UpdateMemberRoleInput } from '@yallego/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import { inviteMember, removeMember, revokeInvitation, updateMemberRole } from '../api/team';
import { teamQueryKeys } from './use-team';

export function useTeamActions() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();

  const refreshMembers = () => queryClient.invalidateQueries({ queryKey: teamQueryKeys.members });
  const refreshInvitations = () =>
    queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations });

  const invite = useMutation({
    mutationFn: (input: InviteMemberInput) => inviteMember(accessToken, input),
    onSuccess: refreshInvitations,
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: UpdateMemberRoleInput }) =>
      updateMemberRole(accessToken, memberId, input),
    onSuccess: refreshMembers,
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(accessToken, memberId),
    onSuccess: refreshMembers,
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(accessToken, invitationId),
    onSuccess: refreshInvitations,
  });

  return { invite, remove, revoke, updateRole };
}
