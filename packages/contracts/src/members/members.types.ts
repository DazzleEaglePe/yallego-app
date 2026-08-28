import type { MembershipRole } from '../auth/auth.types.js';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface Member {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: MembershipRole;
  joined_at: string;
  last_login_at: string | null;
  is_current_user: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  invited_by: string | null;
}

export interface InvitationPreview {
  email: string;
  role: MembershipRole;
  business_name: string;
  expires_at: string;
  requires_registration: boolean;
}
