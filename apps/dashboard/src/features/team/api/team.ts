import type { Invitation, Member } from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function fetchMembers(accessToken: string): Promise<Member[]> {
  return authenticatedRequest('/members', accessToken);
}

export function fetchInvitations(accessToken: string): Promise<Invitation[]> {
  return authenticatedRequest('/members/invitations', accessToken);
}
