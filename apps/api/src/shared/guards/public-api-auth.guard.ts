import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import type { Request } from 'express';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiKeyVerifier } from '../../modules/api-keys/api-key-verifier';
import { TokenService } from '../../modules/auth/token.service';
import type { AccessTokenPayload } from '../../modules/auth/auth.types';
import { ApiHttpException } from '../errors/api-http.exception';
import type { TenantResourceContext } from './tenant.guard';

export type AccessContext =
  | { type: 'user'; role: import('@prisma/client').MembershipRole; userId: string }
  | { type: 'api_key'; scopes: string[]; apiKeyId: string; rateLimitPerMinute: number };

export interface PublicApiRequest extends Request {
  tenant: TenantResourceContext;
  access: AccessContext;
  auth?: AccessTokenPayload;
}

/**
 * docs/06_API_CONTRACT.md §1.1: la superficie pública y el panel comparten la
 * misma base `/v1`. Este guard resuelve el tenant activo desde CUALQUIERA de
 * las dos credenciales, para que el mismo controlador y el mismo servicio
 * sirvan a ambas sin duplicar rutas. El tenant nunca sale del cuerpo, la ruta
 * ni una cabecera controlada por el cliente — siempre se deriva de la
 * credencial (docs/07_SEGURIDAD_AUTH.md §6.2).
 */
@Injectable()
export class PublicApiAuthGuard implements CanActivate {
  constructor(
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(ApiKeyVerifier) private readonly apiKeyVerifier: ApiKeyVerifier,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PublicApiRequest>();
    const authorization = request.header('authorization');
    const [scheme, credential] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !credential) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'Falta la credencial de acceso.',
      );
    }

    if (credential.startsWith('yk_')) {
      return this.activateWithApiKey(request, credential);
    }
    return this.activateWithSession(request, credential);
  }

  private async activateWithApiKey(
    request: PublicApiRequest,
    credential: string,
  ): Promise<boolean> {
    const verified = await this.apiKeyVerifier.verify(credential);
    if (!verified) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'La clave de API no es válida.',
      );
    }

    request.tenant = {
      id: verified.tenantId,
      slug: verified.tenantSlug,
      businessName: verified.tenantBusinessName,
    };
    request.access = {
      type: 'api_key',
      scopes: verified.scopes,
      apiKeyId: verified.apiKeyId,
      rateLimitPerMinute: verified.rateLimitPerMinute,
    };
    return true;
  }

  private async activateWithSession(
    request: PublicApiRequest,
    credential: string,
  ): Promise<boolean> {
    const payload = this.tokenService.verifyAccessToken(credential);

    const membership = await this.prisma.withoutTenantScope((tx) =>
      tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: payload.tid, userId: payload.sub } },
        include: { tenant: { select: { id: true, slug: true, businessName: true, status: true } } },
      }),
    );

    if (!membership || membership.tenant.status !== TenantStatus.ACTIVE) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'Ya no perteneces a este negocio. Vuelve a iniciar sesión.',
      );
    }

    request.tenant = {
      id: membership.tenant.id,
      slug: membership.tenant.slug,
      businessName: membership.tenant.businessName,
    };
    request.access = { type: 'user', role: membership.role, userId: payload.sub };
    request.auth = payload;
    return true;
  }
}
