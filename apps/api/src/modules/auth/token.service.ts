import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MembershipRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

import type { Environment } from '../../config/env.schema';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { AccessTokenPayload } from './auth.types';

@Injectable()
export class TokenService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {}

  createOpaqueToken(prefix: 'rt' | 'ev' | 'pr'): string {
    return `${prefix}_${randomBytes(48).toString('base64url')}`;
  }

  hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  createFamilyId(): string {
    return randomUUID();
  }

  getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + this.getRefreshTokenTtlSeconds() * 1_000);
  }

  getRefreshTokenTtlSeconds(): number {
    return parseDurationToSeconds(this.config.get('JWT_REFRESH_TTL', { infer: true }));
  }

  issueAccessToken(input: {
    email: string;
    role: MembershipRole;
    tenantId: string;
    userId: string;
  }): { token: string; expiresIn: number } {
    const privateKey = this.getKey('JWT_PRIVATE_KEY');
    const expiresIn = parseDurationToSeconds(this.config.get('JWT_ACCESS_TTL', { infer: true }));
    const token = jwt.sign(
      {
        email: input.email,
        tid: input.tenantId,
        role: input.role,
        type: 'access',
      },
      privateKey,
      {
        algorithm: 'RS256',
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        expiresIn,
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
        jwtid: randomUUID(),
        subject: input.userId,
      },
    );

    return { token, expiresIn };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, this.getKey('JWT_PUBLIC_KEY'), {
        algorithms: ['RS256'],
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
      });

      if (
        typeof payload === 'string' ||
        payload.type !== 'access' ||
        typeof payload.sub !== 'string' ||
        typeof payload.jti !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.tid !== 'string' ||
        typeof payload.role !== 'string' ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        throw new Error('Invalid access token payload.');
      }

      return payload as AccessTokenPayload;
    } catch {
      throw new ApiHttpException(401, 'UNAUTHENTICATED', 'La sesión no es válida o expiró.');
    }
  }

  private getKey(name: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY'): string {
    const configured = this.config.get(name, { infer: true });
    if (!configured) {
      throw new ApiHttpException(
        503,
        'SERVICE_UNAVAILABLE',
        'La firma de sesiones no está configurada.',
      );
    }

    return configured.includes('BEGIN')
      ? configured.replaceAll('\\n', '\n')
      : Buffer.from(configured, 'base64').toString('utf8');
  }
}

export function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) throw new Error(`Duración no válida: ${duration}`);

  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = { s: 1, m: 60, h: 3_600, d: 86_400 }[unit as 's' | 'm' | 'h' | 'd'];
  return value * multiplier;
}
