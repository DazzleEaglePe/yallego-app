import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AccessTokenPayload } from '../../modules/auth/auth.types';
import { TokenService } from '../../modules/auth/token.service';
import { ApiHttpException } from '../errors/api-http.exception';

export interface AuthenticatedRequest extends Request {
  auth: AccessTokenPayload;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(@Inject(TokenService) private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new ApiHttpException(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
    }

    request.auth = this.tokenService.verifyAccessToken(token);
    return true;
  }
}
