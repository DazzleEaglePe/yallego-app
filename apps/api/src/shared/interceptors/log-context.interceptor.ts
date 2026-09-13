import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * RNF-OBS-001: agrega tenant y actor a la línea de log final de cada
 * solicitud. Corre DESPUÉS de los guards (orden de Nest: middleware → guards
 * → interceptores → handler), así que lee lo que cualquiera de ellos ya
 * dejó en `request` en vez de resolverlo de nuevo — un único punto que
 * conoce las distintas formas de contexto (panel, clave de API,
 * dispositivo, administrador de plataforma) sin tocar cada guard.
 */
@Injectable()
export class LogContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request & Record<string, unknown>>();
    const tenant = request.tenant as { id?: string } | undefined;
    const access = request.access as
      { type?: string; userId?: string; apiKeyId?: string } | undefined;
    const auth = request.auth as { sub?: string } | undefined;
    const device = request.device as { id?: string } | undefined;
    const platformAdmin = request.platformAdmin as { id?: string } | undefined;

    request.logContext = {
      ...(tenant?.id ? { tenantId: tenant.id } : {}),
      ...(access?.type === 'api_key' ? { actorType: 'api_key', apiKeyId: access.apiKeyId } : {}),
      ...(access?.type === 'user' || auth?.sub
        ? { actorType: 'user', actorUserId: access?.userId ?? auth?.sub }
        : {}),
      ...(device?.id ? { actorType: 'device', deviceId: device.id } : {}),
      ...(platformAdmin?.id
        ? { actorType: 'platform_admin', platformAdminId: platformAdmin.id }
        : {}),
    };

    return next.handle();
  }
}
