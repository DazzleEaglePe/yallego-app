import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  switchTenantSchema,
  verifyEmailSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SwitchTenantInput,
  type VerifyEmailInput,
} from '@yallego/contracts';
import type { Request, Response } from 'express';

import type { Environment } from '../../config/env.schema';
import { CurrentSession } from '../../shared/decorators/current-session.decorator';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { AccessTokenGuard } from '../../shared/guards/access-token.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { AccessTokenPayload, RequestMetadata, SessionResult } from './auth.types';

const REFRESH_COOKIE = 'yallego_refresh';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService<Environment, true>,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body(new ZodValidationPipe(registerSchema)) input: RegisterInput) {
    return this.authService.register(input);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) input: VerifyEmailInput) {
    return this.authService.verifyEmail(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(input, requestMetadata(request));
    this.setRefreshCookie(response, session);
    return sessionResponse(session);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) input: RefreshInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = input.refresh_token ?? request.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new ApiHttpException(401, 'UNAUTHENTICATED', 'La sesión no es válida o expiró.');
    }
    const session = await this.authService.refresh(
      refreshToken,
      requestMetadata(request),
      input.tenant_id,
    );
    this.setRefreshCookie(response, session);
    return sessionResponse(session);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(refreshSchema)) input: RefreshInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(
      input.refresh_token ?? request.cookies?.[REFRESH_COOKIE],
      requestMetadata(request),
    );
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) input: ForgotPasswordInput) {
    return this.authService.forgotPassword(input);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) input: ResetPasswordInput) {
    return this.authService.resetPassword(input);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  changePassword(
    @CurrentSession() session: AccessTokenPayload,
    @Body(new ZodValidationPipe(changePasswordSchema)) input: ChangePasswordInput,
  ) {
    return this.authService.changePassword(session, input);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  getProfile(@CurrentSession() session: AccessTokenPayload) {
    return this.authService.getProfile(session);
  }

  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  switchTenant(
    @CurrentSession() session: AccessTokenPayload,
    @Body(new ZodValidationPipe(switchTenantSchema)) input: SwitchTenantInput,
  ) {
    return this.authService.switchTenant(session, input);
  }

  private setRefreshCookie(response: Response, session: SessionResult): void {
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.cookieOptions(),
      maxAge: session.refreshTokenExpiresIn * 1_000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      path: '/v1/auth',
      sameSite: 'strict' as const,
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
    };
  }
}

function requestMetadata(request: Request): RequestMetadata {
  return {
    ipAddress: request.ip,
    userAgent: request.header('user-agent')?.slice(0, 1_000),
  };
}

function sessionResponse(session: SessionResult) {
  return {
    access_token: session.accessToken,
    active_tenant_id: session.activeTenantId,
    expires_in: session.accessTokenExpiresIn,
    user: {
      id: session.user.id,
      email: session.user.email,
      full_name: session.user.fullName,
    },
    tenants: session.tenants.map((tenant) => ({
      id: tenant.id,
      slug: tenant.slug,
      business_name: tenant.businessName,
      role: tenant.role,
    })),
  };
}
