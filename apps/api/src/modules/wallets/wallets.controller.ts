import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import {
  activateWalletSchema,
  updateWalletSchema,
  type ActivateWalletInput,
  type UpdateWalletInput,
} from '@yallego/contracts';

import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { TenantScoped } from '../../shared/decorators/tenant-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(@Inject(WalletsService) private readonly walletsService: WalletsService) {}

  @Get('catalog')
  @TenantScoped(MembershipRole.VIEWER)
  listCatalog() {
    return this.walletsService.listCatalog();
  }

  @Get()
  @TenantScoped(MembershipRole.VIEWER)
  listTenantWallets(@CurrentTenant() tenant: TenantContext) {
    return this.walletsService.listTenantWallets(tenant);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @TenantScoped(MembershipRole.ADMIN)
  activateWallet(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(activateWalletSchema)) input: ActivateWalletInput,
  ) {
    return this.walletsService.activateWallet(tenant, input);
  }

  @Patch(':id')
  @TenantScoped(MembershipRole.ADMIN)
  updateWallet(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') tenantWalletId: string,
    @Body(new ZodValidationPipe(updateWalletSchema)) input: UpdateWalletInput,
  ) {
    return this.walletsService.updateWallet(tenant, tenantWalletId, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @TenantScoped(MembershipRole.ADMIN)
  deactivateWallet(@CurrentTenant() tenant: TenantContext, @Param('id') tenantWalletId: string) {
    return this.walletsService.deactivateWallet(tenant, tenantWalletId);
  }
}
