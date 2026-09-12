import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { changeSubscriptionSchema, type ChangeSubscriptionInput } from '@yallego/contracts';

import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { TenantScoped } from '../../shared/decorators/tenant-scoped.decorator';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { PlansService } from './plans.service';

@Controller()
export class PlansController {
  constructor(@Inject(PlansService) private readonly plans: PlansService) {}

  /** Catálogo público (docs/06_API_CONTRACT.md §11): sin autenticación, es información de precios. */
  @Get('plans')
  listPlans() {
    return this.plans.listPlans();
  }

  @Get('subscription')
  @TenantScoped(MembershipRole.OWNER)
  getSubscription(@CurrentTenant() tenant: TenantContext) {
    return this.plans.getCurrentSubscription(tenant);
  }

  @Get('subscription/history')
  @TenantScoped(MembershipRole.OWNER)
  getHistory(@CurrentTenant() tenant: TenantContext) {
    return this.plans.listHistory(tenant);
  }

  @Post('subscription/change')
  @HttpCode(HttpStatus.ACCEPTED)
  @TenantScoped(MembershipRole.OWNER)
  requestChange(
    @Body(new ZodValidationPipe(changeSubscriptionSchema)) input: ChangeSubscriptionInput,
  ) {
    return this.plans.requestChange(input);
  }
}
