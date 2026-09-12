import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { acceptInvitationSchema, type AcceptInvitationInput } from '@yallego/contracts';
import type { Request, Response } from 'express';

import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import type { SessionResult } from '../auth/auth.types';
import { MembersService } from './members.service';

const REFRESH_COOKIE = 'yallego_refresh';

/**
 * Endpoints públicos de invitación, sin sesión de tenant: el token del correo
 * es la única credencial. Fuera de `/v1/members` a propósito, tal como los
 * describe `docs/06_API_CONTRACT.md` §4.
 */
@Controller('invitations')
export class InvitationsController {
  constructor(@Inject(MembersService) private readonly membersService: MembersService) {}

  @Get(':token')
  previewInvitation(@Param('token') token: string) {
    return this.membersService.previewInvitation(token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body(new ZodValidationPipe(acceptInvitationSchema)) input: AcceptInvitationInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.membersService.acceptInvitation(input, {
      ipAddress: request.ip,
      userAgent: request.header('user-agent')?.slice(0, 1_000),
    });

    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      path: '/v1/auth',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: session.refreshTokenExpiresIn * 1_000,
    });

    return sessionResponse(session);
  }
}

function sessionResponse(session: SessionResult) {
  return {
    access_token: session.accessToken,
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
