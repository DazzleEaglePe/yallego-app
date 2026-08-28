import {
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { MembershipRole, TenantStatus } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../errors/api-http.exception';
import type { AuthenticatedRequest } from './access-token.guard';

/**
 * Lo mínimo que necesita la capa de negocio para operar sobre un tenant.
 * Tanto una sesión de usuario (`TenantContext`) como una API key
 * (`shared/guards/public-api-auth.guard.ts`) satisfacen esta forma — ninguna
 * de las dos tiene una membresía o un rol en el sentido de la otra.
 */
export interface TenantResourceContext {
  id: string;
  slug: string;
  businessName: string;
}

export interface TenantContext extends TenantResourceContext {
  membershipId: string;
  role: MembershipRole;
}

export interface TenantScopedRequest extends AuthenticatedRequest {
  tenant: TenantContext;
}

/**
 * Resuelve el tenant activo a partir de la credencial y confirma que la
 * membresía sigue vigente.
 *
 * El identificador nunca proviene del cuerpo, de la ruta ni de una cabecera:
 * se lee del token. Releer la membresía en cada solicitud hace que un cambio
 * de rol o una remoción surtan efecto de inmediato, sin esperar a que expire
 * el token de acceso.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const session = request.auth;

    if (!session) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'Debes iniciar sesión para continuar.',
      );
    }

    const membership = await this.prisma.withoutTenantScope((tx) =>
      tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: session.tid, userId: session.sub } },
        include: {
          tenant: { select: { id: true, slug: true, businessName: true, status: true } },
        },
      }),
    );

    if (!membership) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'Ya no perteneces a este negocio. Vuelve a iniciar sesión.',
      );
    }

    if (membership.tenant.status !== TenantStatus.ACTIVE) {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'El negocio está suspendido. Comunícate con soporte.',
      );
    }

    request.tenant = {
      id: membership.tenant.id,
      slug: membership.tenant.slug,
      businessName: membership.tenant.businessName,
      membershipId: membership.id,
      role: membership.role,
    };

    return true;
  }
}
