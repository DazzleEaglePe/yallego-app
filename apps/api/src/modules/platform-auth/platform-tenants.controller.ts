import { Body, Controller, Get, Inject, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  listPlatformTenantsQuerySchema,
  updateTenantStatusSchema,
  type ListPlatformTenantsQuery,
  type UpdateTenantStatusInput,
} from '@yallego/contracts';

import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { CurrentPlatformAdmin } from './current-platform-admin.decorator';
import { PlatformAuthGuard, type PlatformAdminContext } from './platform-auth.guard';
import { PlatformIpAllowlistGuard } from './platform-ip-allowlist.guard';
import { PlatformTenantsService } from './platform-tenants.service';

@Controller('platform/v1/tenants')
@UseGuards(PlatformIpAllowlistGuard, PlatformAuthGuard)
export class PlatformTenantsController {
  constructor(@Inject(PlatformTenantsService) private readonly tenants: PlatformTenantsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listPlatformTenantsQuerySchema)) query: ListPlatformTenantsQuery,
  ) {
    return this.tenants.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.tenants.getById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentPlatformAdmin() admin: PlatformAdminContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTenantStatusSchema)) input: UpdateTenantStatusInput,
  ) {
    return this.tenants.updateStatus(id, admin.id, input);
  }
}
