export interface PlatformAccessTokenPayload {
  sub: string;
  email: string;
  type: 'platform_admin';
  jti: string;
  iat: number;
  exp: number;
}

export interface PlatformRequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}
