import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { platformLoginSchema, type PlatformLoginInput } from '@yallego/contracts';
import type { Request } from 'express';

import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { CurrentPlatformAdmin } from './current-platform-admin.decorator';
import { PlatformAuthGuard, type PlatformAdminContext } from './platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformIpAllowlistGuard } from './platform-ip-allowlist.guard';

@Controller('platform/v1/auth')
@UseGuards(PlatformIpAllowlistGuard)
export class PlatformAuthController {
  constructor(@Inject(PlatformAuthService) private readonly platformAuth: PlatformAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(platformLoginSchema)) input: PlatformLoginInput,
    @Req() request: Request,
  ) {
    return this.platformAuth.login(input, {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PlatformAuthGuard)
  refresh(@CurrentPlatformAdmin() admin: PlatformAdminContext, @Req() request: Request) {
    return this.platformAuth.refresh(admin.id, admin.email, {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
    });
  }
}
