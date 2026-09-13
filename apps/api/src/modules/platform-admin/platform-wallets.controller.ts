import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createWalletCatalogEntrySchema,
  type CreateWalletCatalogEntryInput,
} from '@yallego/contracts';

import { CurrentPlatformAdmin } from '../platform-auth/current-platform-admin.decorator';
import { PlatformAuthGuard, type PlatformAdminContext } from '../platform-auth/platform-auth.guard';
import { PlatformIpAllowlistGuard } from '../platform-auth/platform-ip-allowlist.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { PlatformWalletsService } from './platform-wallets.service';

@Controller('platform/v1/wallets')
@UseGuards(PlatformIpAllowlistGuard, PlatformAuthGuard)
export class PlatformWalletsController {
  constructor(@Inject(PlatformWalletsService) private readonly wallets: PlatformWalletsService) {}

  @Get()
  list() {
    return this.wallets.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentPlatformAdmin() admin: PlatformAdminContext,
    @Body(new ZodValidationPipe(createWalletCatalogEntrySchema))
    input: CreateWalletCatalogEntryInput,
  ) {
    return this.wallets.create(admin.id, input);
  }
}
