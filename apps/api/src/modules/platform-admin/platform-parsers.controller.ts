import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createParserVersionSchema,
  testParserVersionSchema,
  type CreateParserVersionInput,
  type TestParserVersionInput,
} from '@yallego/contracts';

import { CurrentPlatformAdmin } from '../platform-auth/current-platform-admin.decorator';
import { PlatformAuthGuard, type PlatformAdminContext } from '../platform-auth/platform-auth.guard';
import { PlatformIpAllowlistGuard } from '../platform-auth/platform-ip-allowlist.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { PlatformParsersService } from './platform-parsers.service';

@Controller('platform/v1/parsers')
@UseGuards(PlatformIpAllowlistGuard, PlatformAuthGuard)
export class PlatformParsersController {
  constructor(@Inject(PlatformParsersService) private readonly parsers: PlatformParsersService) {}

  @Get(':walletId/versions')
  listVersions(@Param('walletId') walletId: string) {
    return this.parsers.listVersions(walletId);
  }

  @Post(':walletId/versions')
  createVersion(
    @CurrentPlatformAdmin() admin: PlatformAdminContext,
    @Param('walletId') walletId: string,
    @Body(new ZodValidationPipe(createParserVersionSchema)) input: CreateParserVersionInput,
  ) {
    return this.parsers.createVersion(walletId, admin.id, input);
  }

  @Post('versions/:id/test')
  @HttpCode(HttpStatus.OK)
  testVersion(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(testParserVersionSchema)) input: TestParserVersionInput,
  ) {
    return this.parsers.testVersion(id, input);
  }

  @Post('versions/:id/activate')
  @HttpCode(HttpStatus.OK)
  activateVersion(@CurrentPlatformAdmin() admin: PlatformAdminContext, @Param('id') id: string) {
    return this.parsers.activateVersion(id, admin.id);
  }
}
