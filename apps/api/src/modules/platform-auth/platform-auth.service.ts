import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { PlatformAdmin } from '@prisma/client';
import type { PlatformLoginInput, PlatformSessionResult } from '@yallego/contracts';

import { EncryptionService } from '../../infrastructure/crypto/encryption.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import type { PlatformRequestMetadata } from './platform-auth.types';
import { verifyTotp } from './totp';

const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
const LOCK_DURATION_MS = 15 * 60 * 1_000;
const MAX_FAILED_ATTEMPTS = 5;

/**
 * docs/07_SEGURIDAD_AUTH.md §11: autenticación de administradores de
 * plataforma, deliberadamente separada de `AuthService` (sin código
 * compartido más allá de `PasswordService`/`TokenService`, que ya son
 * genéricos) — "sin relación con las cuentas de tenant" no es solo una
 * frase, es una propiedad que se rompería si ambos flujos compartieran
 * lógica de sesión.
 *
 * No hay ruta de autorregistro: los administradores se aprovisionan fuera de
 * banda (`scripts/create-platform-admin.ts`), nunca por una API pública.
 */
@Injectable()
export class PlatformAuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(EncryptionService) private readonly cipher: EncryptionService,
  ) {}

  async login(
    input: PlatformLoginInput,
    metadata: PlatformRequestMetadata,
  ): Promise<PlatformSessionResult> {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { email: input.email } });
    if (!admin || !admin.isActive) {
      throw this.invalidCredentialsError();
    }

    const now = new Date();
    if (admin.lockedUntil && admin.lockedUntil > now) {
      throw new ApiHttpException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT_EXCEEDED',
        'La cuenta está bloqueada temporalmente por intentos fallidos.',
        {
          locked_until: admin.lockedUntil.toISOString(),
        },
      );
    }

    const passwordIsValid = await this.passwordService.verify(admin.passwordHash, input.password);
    if (!passwordIsValid) {
      await this.recordFailedLogin(admin, metadata);
      throw this.invalidCredentialsError();
    }

    if (!admin.totpSecret) {
      // No debería ocurrir: el segundo factor es obligatorio desde el
      // aprovisionamiento. Tratarlo como cuenta inválida en vez de aceptar
      // sin segundo factor.
      throw this.invalidCredentialsError();
    }

    const totpSecret = Buffer.from(this.cipher.decrypt(admin.totpSecret), 'base64');
    if (!verifyTotp(totpSecret, input.totp_code)) {
      await this.recordFailedLogin(admin, metadata);
      throw this.invalidCredentialsError();
    }

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        failedAttempts: 0,
        failedAttemptsStartedAt: null,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });
    await this.writeAuditEvent('platform.login_succeeded', admin.id, metadata);

    const { token, expiresIn } = this.tokenService.issuePlatformAccessToken({
      adminId: admin.id,
      email: admin.email,
    });
    return {
      access_token: token,
      expires_in: expiresIn,
      admin: { id: admin.id, email: admin.email, full_name: admin.fullName },
    };
  }

  /** "Renovación por actividad" (docs/07 §11): exige un token todavía válido, no reautentica desde cero. */
  async refresh(
    adminId: string,
    email: string,
    metadata: PlatformRequestMetadata,
  ): Promise<PlatformSessionResult> {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { id: adminId } });
    if (!admin || !admin.isActive) {
      throw new ApiHttpException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'La cuenta de administrador ya no está activa.',
      );
    }

    await this.writeAuditEvent('platform.session_renewed', admin.id, metadata);
    const { token, expiresIn } = this.tokenService.issuePlatformAccessToken({
      adminId: admin.id,
      email,
    });
    return {
      access_token: token,
      expires_in: expiresIn,
      admin: { id: admin.id, email: admin.email, full_name: admin.fullName },
    };
  }

  private async recordFailedLogin(
    admin: PlatformAdmin,
    metadata: PlatformRequestMetadata,
  ): Promise<void> {
    const now = new Date();
    const windowExpired =
      !admin.failedAttemptsStartedAt ||
      now.getTime() - admin.failedAttemptsStartedAt.getTime() > LOGIN_WINDOW_MS;
    const nextAttempts = windowExpired ? 1 : admin.failedAttempts + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        failedAttempts: nextAttempts,
        failedAttemptsStartedAt: windowExpired ? now : admin.failedAttemptsStartedAt,
        lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_DURATION_MS) : null,
      },
    });
    await this.writeAuditEvent(
      shouldLock ? 'platform.account_locked' : 'platform.login_failed',
      admin.id,
      metadata,
    );
  }

  private async writeAuditEvent(
    action: string,
    platformAdminId: string,
    metadata: PlatformRequestMetadata,
  ): Promise<void> {
    await this.prisma.withoutTenantScope((tx) =>
      tx.auditEvent.create({
        data: {
          action,
          actorType: 'PLATFORM_ADMIN',
          actorPlatformAdminId: platformAdminId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      }),
    );
  }

  private invalidCredentialsError(): ApiHttpException {
    return new ApiHttpException(
      HttpStatus.UNAUTHORIZED,
      'UNAUTHENTICATED',
      'Las credenciales no son correctas.',
    );
  }
}
