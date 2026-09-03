import type { MembershipRole } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  tid: string;
  role: MembershipRole;
  type: 'access';
  jti: string;
  iat: number;
  exp: number;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  activeTenantId: string;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  tenants: Array<{
    id: string;
    slug: string;
    businessName: string;
    role: MembershipRole;
  }>;
}
