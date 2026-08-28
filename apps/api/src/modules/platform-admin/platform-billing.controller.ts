import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  applyTenantSubscriptionSchema,
  grantCourtesyPlanSchema,
  registerManualPaymentSchema,
  type ApplyTenantSubscriptionInput,
  type GrantCourtesyPlanInput,
  type RegisterManualPaymentInput,
  type SubscriptionChangeApplicationResult,
} from '@yallego/contracts';

import {
  PlanChangeApplicationService,
  type SubscriptionChangeApplicationResult as InternalResult,
} from '../plans/plan-change-application.service';
import { CurrentPlatformAdmin } from '../platform-auth/current-platform-admin.decorator';
import { PlatformAuthGuard, type PlatformAdminContext } from '../platform-auth/platform-auth.guard';
import { PlatformIpAllowlistGuard } from '../platform-auth/platform-ip-allowlist.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';

function toWireFormat(result: InternalResult): SubscriptionChangeApplicationResult {
  return {
    tenant_id: result.tenantId,
    from_plan: result.fromPlan,
    to_plan: result.toPlan,
    effective_at: result.effectiveAt.toISOString(),
    immediate: result.immediate,
  };
}

@UseGuards(PlatformIpAllowlistGuard, PlatformAuthGuard)
@Controller('platform/v1')
export class PlatformBillingController {
  constructor(
    @Inject(PlanChangeApplicationService)
    private readonly planChanges: PlanChangeApplicationService,
  ) {}

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  registerPayment(
    @CurrentPlatformAdmin() admin: PlatformAdminContext,
    @Body(new ZodValidationPipe(registerManualPaymentSchema)) input: RegisterManualPaymentInput,
  ) {
    return this.planChanges.registerManualPayment(
      {
        tenantId: input.tenant_id,
        amount: input.amount,
        currency: input.currency,
        method: input.method,
        reference: input.reference,
        coversFrom: new Date(input.covers_from),
        coversTo: new Date(input.covers_to),
        notes: input.notes,
      },
      admin.id,
    );
  }

  @Post('tenants/:id/subscription')
  @HttpCode(HttpStatus.OK)
  async applySubscriptionChange(
    @CurrentPlatformAdmin() admin: PlatformAdminContext,
    @Param('id') tenantId: string,
    @Body(new ZodValidationPipe(applyTenantSubscriptionSchema)) input: ApplyTenantSubscriptionInput,
  ) {
    const result = await this.planChanges.applyConfirmedChange(
      tenantId,
      input.plan_code,
      input.billing_cycle,
      admin.id,
      input.reason,
    );
    return toWireFormat(result);
  }

  @Post('tenants/:id/courtesy-plan')
  @HttpCode(HttpStatus.OK)
  async grantCourtesyPlan(
    @CurrentPlatformAdmin() admin: PlatformAdminContext,
    @Param('id') tenantId: string,
    @Body(new ZodValidationPipe(grantCourtesyPlanSchema)) input: GrantCourtesyPlanInput,
  ) {
    const result = await this.planChanges.grantCourtesyPlan(
      tenantId,
      input.plan_code,
      input.billing_cycle,
      admin.id,
      input.reason,
    );
    return toWireFormat(result);
  }
}
