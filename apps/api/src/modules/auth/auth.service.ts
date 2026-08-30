import { randomUUID } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  MembershipRole,
  OneTimeTokenPurpose,
  Prisma,
  SubscriptionStatus,
  TenantStatus,
} from '@prisma/client';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SwitchTenantInput,
  VerifyEmailInput,
} from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { AccessTokenPayload, RequestMetadata, SessionResult } from './auth.types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const LOGIN_WINDOW_MS = 15 * 60 * 1_000;
const LOCK_DURATION_MS = 15 * 60 * 1_000;
const MAX_FAILED_ATTEMPTS = 5;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1_000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1_000;
const DEFAULT_WALLET_CODE = 'YAPE';

export type UserWithMemberships = Prisma.UserGetPayload<{
  include: { memberships: { include: { tenant: true } } };
}>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(MailerService) private readonly mailer: MailerService,
  ) {}

  async register(input: RegisterInput): Promise<{
    message: string;
    tenant: { business_name: string; id: string; slug: string };
    user: { email: string; full_name: string; id: string };
  }> {
    this.passwordService.assertAllowed(input.password);
    const passwordHash = await this.passwordService.hash(input.password);
    const verificationToken = this.tokenService.createOpaqueToken('ev');
    const verificationHash = this.tokenService.hashOpaqueToken(verificationToken);

    try {
      const result = await this.prisma.withoutTenantScope(async (transaction) => {
        const freePlan = await transaction.plan.findUnique({ where: { code: 'FREE' } });
        if (!freePlan) {
          throw new ApiHttpException(
            HttpStatus.SERVICE_UNAVAILABLE,
            'SERVICE_UNAVAILABLE',
            'Los planes del sistema todavía no están configurados.',
          );
        }

        const slug = await this.allocateTenantSlug(transaction, input.business_name);
        const user = await transaction.user.create({
          data: {
            email: input.email,
            fullName: input.full_name,
            passwordHash,
          },
        });
        const tenant = await transaction.tenant.create({
          data: {
            businessName: input.business_name,
            slug,
          },
        });
        // Mientras el selector de billeteras sigue fuera del MVP, un negocio
        // nuevo necesita al menos una fuente activa; de otro modo el Android
        // recibe monitored_packages=[] y descarta todos los cobros.
        const defaultWallet = await transaction.wallet.findUnique({
          where: { code: DEFAULT_WALLET_CODE },
        });
        if (defaultWallet?.isActive) {
          await transaction.tenantWallet.create({
            data: {
              tenantId: tenant.id,
              walletId: defaultWallet.id,
            },
          });
        }
        await transaction.membership.create({
          data: {
            role: MembershipRole.OWNER,
            tenantId: tenant.id,
            userId: user.id,
          },
        });
        const periodStart = new Date();
        const periodEnd = addCalendarMonth(periodStart);
        await transaction.subscription.create({
          data: {
            periodEnd,
            periodStart,
            planId: freePlan.id,
            status: SubscriptionStatus.ACTIVE,
            tenantId: tenant.id,
          },
        });
        await transaction.oneTimeToken.create({
          data: {
            expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
            purpose: OneTimeTokenPurpose.EMAIL_VERIFICATION,
            tokenHash: verificationHash,
            userId: user.id,
          },
        });
        await transaction.auditEvent.create({
          data: {
            action: 'auth.user_registered',
            actorType: 'USER',
            actorUserId: user.id,
            resourceId: user.id,
            resourceType: 'user',
            tenantId: tenant.id,
          },
        });

        return { tenant, user };
      });

      await this.mailer.sendVerificationEmail({
        email: result.user.email,
        fullName: result.user.fullName,
        token: verificationToken,
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          full_name: result.user.fullName,
        },
        tenant: {
          id: result.tenant.id,
          slug: result.tenant.slug,
          business_name: result.tenant.businessName,
        },
        message: 'Se envió un enlace de verificación al correo indicado.',
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiHttpException(
          HttpStatus.CONFLICT,
          'DUPLICATE_RESOURCE',
          'Ya existe una cuenta con este correo electrónico.',
        );
      }
      throw error;
    }
  }

  async verifyEmail(input: VerifyEmailInput): Promise<{ message: string }> {
    const tokenHash = this.tokenService.hashOpaqueToken(input.token);
    const now = new Date();
    const token = await this.prisma.oneTimeToken.findUnique({ where: { tokenHash } });

    if (
      !token ||
      token.purpose !== OneTimeTokenPurpose.EMAIL_VERIFICATION ||
      token.consumedAt ||
      token.expiresAt <= now
    ) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'El enlace de verificación no es válido o ya expiró.',
      );
    }

    await this.prisma.withoutTenantScope(async (transaction) => {
      const consumed = await transaction.oneTimeToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'El enlace de verificación no es válido o ya expiró.',
        );
      }

      await transaction.user.update({
        where: { id: token.userId },
        data: { emailVerified: true },
      });
      await transaction.auditEvent.create({
        data: {
          action: 'auth.email_verified',
          actorType: 'USER',
          actorUserId: token.userId,
          resourceId: token.userId,
          resourceType: 'user',
        },
      });
    });

    return { message: 'Correo verificado correctamente.' };
  }

  async login(input: LoginInput, metadata: RequestMetadata): Promise<SessionResult> {
    const user = await this.findUserWithMemberships(input.email);
    if (!user) {
      throw this.invalidCredentialsError();
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      throw new ApiHttpException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMIT_EXCEEDED',
        'La cuenta está bloqueada temporalmente por intentos fallidos.',
        { locked_until: user.lockedUntil.toISOString() },
      );
    }

    const passwordIsValid = await this.passwordService.verify(user.passwordHash, input.password);
    if (!passwordIsValid) {
      await this.recordFailedLogin(user, metadata);
      throw this.invalidCredentialsError();
    }

    if (!user.emailVerified) {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Verifica tu correo electrónico antes de ingresar.',
      );
    }

    if (user.memberships.length === 0) {
      throw new ApiHttpException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'La cuenta no pertenece a un negocio activo.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        failedAttemptsStartedAt: null,
        lastLoginAt: now,
        lockedUntil: null,
      },
    });
    await this.writeAuditEvent('auth.login_succeeded', user, metadata);

    return this.startSession(user, metadata);
  }

  async refresh(
    refreshToken: string,
    metadata: RequestMetadata,
    activeTenantId?: string,
  ): Promise<SessionResult> {
    const tokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const current = await this.prisma.withoutTenantScope((tx) =>
      tx.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              memberships: {
                include: { tenant: true },
                orderBy: { joinedAt: 'asc' },
                where: { tenant: { status: TenantStatus.ACTIVE } },
              },
            },
          },
        },
      }),
    );

    if (!current) throw this.invalidSessionError();
    if (current.revokedAt) {
      await this.revokeTokenFamily(current.familyId);
      await this.writeAuditEvent('auth.refresh_reuse_detected', current.user, metadata);
      throw this.invalidSessionError();
    }
    if (current.expiresAt <= new Date() || current.user.memberships.length === 0) {
      await this.prisma.refreshToken.update({
        where: { id: current.id },
        data: { revokedAt: new Date() },
      });
      throw this.invalidSessionError();
    }

    const membership =
      current.user.memberships.find(({ tenantId }) => tenantId === activeTenantId) ??
      current.user.memberships[0];
    if (!membership) throw this.invalidSessionError();
    const nextRawToken = this.tokenService.createOpaqueToken('rt');
    const nextHash = this.tokenService.hashOpaqueToken(nextRawToken);
    const access = this.tokenService.issueAccessToken({
      email: current.user.email,
      role: membership.role,
      tenantId: membership.tenantId,
      userId: current.user.id,
    });

    try {
      await this.prisma.$transaction(async (transaction) => {
        const revoked = await transaction.refreshToken.updateMany({
          where: { id: current.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (revoked.count !== 1) throw new RefreshTokenReuseError();

        const next = await transaction.refreshToken.create({
          data: {
            expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
            familyId: current.familyId,
            ipAddress: metadata.ipAddress,
            tokenHash: nextHash,
            userAgent: metadata.userAgent,
            userId: current.userId,
          },
        });
        await transaction.refreshToken.update({
          where: { id: current.id },
          data: { replacedById: next.id },
        });
      });
    } catch (error) {
      if (error instanceof RefreshTokenReuseError) {
        await this.revokeTokenFamily(current.familyId);
        throw this.invalidSessionError();
      }
      throw error;
    }

    return this.mapSession(current.user, nextRawToken, access, membership.tenantId);
  }

  async logout(refreshToken: string | undefined, metadata: RequestMetadata): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.tokenService.hashOpaqueToken(refreshToken);
    const token = await this.prisma.withoutTenantScope((tx) =>
      tx.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } }),
    );
    if (!token) return;

    await this.prisma.refreshToken.updateMany({
      where: { id: token.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.writeAuditEvent('auth.logout', token.user, metadata);
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (user) {
      const rawToken = this.tokenService.createOpaqueToken('pr');
      const tokenHash = this.tokenService.hashOpaqueToken(rawToken);
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.oneTimeToken.updateMany({
          where: {
            userId: user.id,
            purpose: OneTimeTokenPurpose.PASSWORD_RESET,
            consumedAt: null,
          },
          data: { consumedAt: now },
        }),
        this.prisma.oneTimeToken.create({
          data: {
            expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
            purpose: OneTimeTokenPurpose.PASSWORD_RESET,
            tokenHash,
            userId: user.id,
          },
        }),
      ]);
      await this.mailer.sendPasswordResetEmail({
        email: user.email,
        fullName: user.fullName,
        token: rawToken,
      });
    }

    return {
      message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    this.passwordService.assertAllowed(input.password);
    const tokenHash = this.tokenService.hashOpaqueToken(input.token);
    const token = await this.prisma.oneTimeToken.findUnique({ where: { tokenHash } });
    const now = new Date();
    if (
      !token ||
      token.purpose !== OneTimeTokenPurpose.PASSWORD_RESET ||
      token.consumedAt ||
      token.expiresAt <= now
    ) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'El enlace de recuperación no es válido o ya expiró.',
      );
    }

    const passwordHash = await this.passwordService.hash(input.password);
    await this.prisma.withoutTenantScope(async (transaction) => {
      const consumed = await transaction.oneTimeToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new ApiHttpException(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'El enlace de recuperación no es válido o ya expiró.',
        );
      }

      await transaction.user.update({
        where: { id: token.userId },
        data: {
          failedAttempts: 0,
          failedAttemptsStartedAt: null,
          lockedUntil: null,
          passwordHash,
        },
      });
      await transaction.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.auditEvent.create({
        data: {
          action: 'auth.password_reset',
          actorType: 'USER',
          actorUserId: token.userId,
          resourceId: token.userId,
          resourceType: 'user',
        },
      });
    });

    return { message: 'La contraseña se actualizó correctamente.' };
  }

  async changePassword(
    session: AccessTokenPayload,
    input: ChangePasswordInput,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: session.sub } });
    if (!user || !(await this.passwordService.verify(user.passwordHash, input.current_password))) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'La contraseña actual no es correcta.',
      );
    }

    this.passwordService.assertAllowed(input.new_password);
    const passwordHash = await this.passwordService.hash(input.new_password);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { message: 'La contraseña se actualizó. Ingresa nuevamente.' };
  }

  /**
   * Reemite el access token con otro tenant al que pertenece el usuario.
   * El refresh token no se modifica (docs/07_SEGURIDAD_AUTH.md §2.4): es una
   * operación ligera, no una nueva sesión.
   */
  async switchTenant(
    session: AccessTokenPayload,
    input: SwitchTenantInput,
  ): Promise<{ access_token: string; active_tenant_id: string; expires_in: number }> {
    const membership = await this.prisma.withoutTenantScope((tx) =>
      tx.membership.findUnique({
        where: { tenantId_userId: { tenantId: input.tenant_id, userId: session.sub } },
        include: { tenant: { select: { status: true } } },
      }),
    );

    if (!membership || membership.tenant.status !== TenantStatus.ACTIVE) {
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No perteneces a ese negocio.');
    }

    const access = this.tokenService.issueAccessToken({
      email: session.email,
      role: membership.role,
      tenantId: membership.tenantId,
      userId: session.sub,
    });

    return {
      access_token: access.token,
      active_tenant_id: membership.tenantId,
      expires_in: access.expiresIn,
    };
  }

  async getProfile(session: AccessTokenPayload): Promise<{
    tenants: Array<{ business_name: string; id: string; role: MembershipRole; slug: string }>;
    user: { email: string; full_name: string; id: string };
  }> {
    const user = await this.findUserWithMemberships(session.email);
    if (!user || user.id !== session.sub) throw this.invalidSessionError();

    return {
      user: { id: user.id, email: user.email, full_name: user.fullName },
      tenants: user.memberships.map(({ role, tenant }) => ({
        id: tenant.id,
        slug: tenant.slug,
        business_name: tenant.businessName,
        role,
      })),
    };
  }

  /** Público: lo reutiliza el módulo de miembros al aceptar una invitación con auto-ingreso. */
  async startSession(user: UserWithMemberships, metadata: RequestMetadata): Promise<SessionResult> {
    const membership = user.memberships[0];
    if (!membership) throw this.invalidSessionError();
    const refreshToken = this.tokenService.createOpaqueToken('rt');
    const access = this.tokenService.issueAccessToken({
      email: user.email,
      role: membership.role,
      tenantId: membership.tenantId,
      userId: user.id,
    });

    await this.prisma.refreshToken.create({
      data: {
        expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
        familyId: this.tokenService.createFamilyId(),
        ipAddress: metadata.ipAddress,
        tokenHash: this.tokenService.hashOpaqueToken(refreshToken),
        userAgent: metadata.userAgent,
        userId: user.id,
      },
    });

    return this.mapSession(user, refreshToken, access, membership.tenantId);
  }

  /** Público por la misma razón que `startSession`. */
  mapSession(
    user: UserWithMemberships,
    refreshToken: string,
    access: { expiresIn: number; token: string },
    activeTenantId: string,
  ): SessionResult {
    return {
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      activeTenantId,
      refreshToken,
      refreshTokenExpiresIn: this.tokenService.getRefreshTokenTtlSeconds(),
      user: { id: user.id, email: user.email, fullName: user.fullName },
      tenants: user.memberships.map(({ role, tenant }) => ({
        id: tenant.id,
        slug: tenant.slug,
        businessName: tenant.businessName,
        role,
      })),
    };
  }

  private findUserWithMemberships(email: string): Promise<UserWithMemberships | null> {
    return this.prisma.withoutTenantScope((tx) =>
      tx.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: { tenant: true },
            orderBy: { joinedAt: 'asc' },
            where: { tenant: { status: TenantStatus.ACTIVE } },
          },
        },
      }),
    );
  }

  private async recordFailedLogin(
    user: UserWithMemberships,
    metadata: RequestMetadata,
  ): Promise<void> {
    const now = new Date();
    const windowExpired =
      !user.failedAttemptsStartedAt ||
      now.getTime() - user.failedAttemptsStartedAt.getTime() > LOGIN_WINDOW_MS;
    const nextAttempts = windowExpired ? 1 : user.failedAttempts + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: nextAttempts,
        failedAttemptsStartedAt: windowExpired ? now : user.failedAttemptsStartedAt,
        lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_DURATION_MS) : null,
      },
    });
    await this.writeAuditEvent(
      shouldLock ? 'auth.account_locked' : 'auth.login_failed',
      user,
      metadata,
    );
  }

  private async writeAuditEvent(
    action: string,
    user: { id: string; memberships?: Array<{ tenantId: string }> },
    metadata: RequestMetadata,
  ): Promise<void> {
    await this.prisma.withoutTenantScope((tx) =>
      tx.auditEvent.create({
        data: {
          action,
          actorType: 'USER',
          actorUserId: user.id,
          ipAddress: metadata.ipAddress,
          tenantId: user.memberships?.[0]?.tenantId,
          userAgent: metadata.userAgent,
        },
      }),
    );
  }

  private revokeTokenFamily(familyId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async allocateTenantSlug(
    transaction: Prisma.TransactionClient,
    businessName: string,
  ): Promise<string> {
    const base = slugify(businessName).slice(0, 64) || 'negocio';
    const exists = await transaction.tenant.findUnique({
      where: { slug: base },
      select: { id: true },
    });
    if (!exists) return base;
    return `${base.slice(0, 55)}-${randomUUID().slice(0, 8)}`;
  }

  private invalidCredentialsError(): ApiHttpException {
    return new ApiHttpException(
      HttpStatus.UNAUTHORIZED,
      'UNAUTHENTICATED',
      'El correo o la contraseña no son correctos.',
    );
  }

  private invalidSessionError(): ApiHttpException {
    return new ApiHttpException(
      HttpStatus.UNAUTHORIZED,
      'UNAUTHENTICATED',
      'La sesión no es válida o expiró.',
    );
  }
}

class RefreshTokenReuseError extends Error {}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function addCalendarMonth(value: Date): Date {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
