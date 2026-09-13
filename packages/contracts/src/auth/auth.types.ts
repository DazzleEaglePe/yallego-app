export type MembershipRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
}

export interface AuthTenant {
  id: string;
  slug: string;
  business_name: string;
  role: MembershipRole;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse {
  access_token: string;
  active_tenant_id: string;
  expires_in: number;
  user: AuthUser;
  tenants: AuthTenant[];
}
