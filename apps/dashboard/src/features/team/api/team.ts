import type {
  Invitation,
  InviteMemberInput,
  Member,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
} from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function fetchMembers(accessToken: string): Promise<Member[]> {
  return authenticatedRequest('/members', accessToken);
}

export function fetchInvitations(accessToken: string): Promise<Invitation[]> {
  return authenticatedRequest('/members/invitations', accessToken);
}

export function inviteMember(accessToken: string, input: InviteMemberInput): Promise<Invitation> {
  return authenticatedRequest('/members/invitations', accessToken, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function updateMemberRole(
  accessToken: string,
  memberId: string,
  input: UpdateMemberRoleInput,
): Promise<Member> {
  return authenticatedRequest(`/members/${memberId}`, accessToken, {
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export function removeMember(accessToken: string, memberId: string): Promise<void> {
  return authenticatedRequest(`/members/${memberId}`, accessToken, { method: 'DELETE' });
}

export function revokeInvitation(accessToken: string, invitationId: string): Promise<void> {
  return authenticatedRequest(`/members/invitations/${invitationId}`, accessToken, {
    method: 'DELETE',
  });
}

export function transferOwnership(
  accessToken: string,
  input: TransferOwnershipInput,
): Promise<void> {
  return authenticatedRequest('/members/transfer-ownership', accessToken, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}
