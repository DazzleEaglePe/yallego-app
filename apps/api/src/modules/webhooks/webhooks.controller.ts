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
  Query,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import {
  listWebhookDeliveriesQuerySchema,
  registerWebhookSchema,
  updateWebhookSchema,
  type ListWebhookDeliveriesQuery,
  type RegisterWebhookInput,
  type UpdateWebhookInput,
} from '@yallego/contracts';

import { CurrentAccess } from '../../shared/decorators/current-access.decorator';
import { CurrentPublicTenant } from '../../shared/decorators/current-public-tenant.decorator';
import { PublicScoped } from '../../shared/decorators/public-scoped.decorator';
import type { AccessContext } from '../../shared/guards/public-api-auth.guard';
import type { TenantResourceContext } from '../../shared/guards/tenant.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import type { WebhookActor } from './webhooks.service';
import { WebhooksService } from './webhooks.service';

function toActor(access: AccessContext): WebhookActor {
  return access.type === 'user'
    ? { type: 'user', userId: access.userId }
    : { type: 'api_key', apiKeyId: access.apiKeyId };
}

@Controller('webhooks')
export class WebhooksController {
  constructor(@Inject(WebhooksService) private readonly webhooks: WebhooksService) {}

  @Get()
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:read' })
  list(@CurrentPublicTenant() tenant: TenantResourceContext) {
    return this.webhooks.list(tenant);
  }

  @Get(':id')
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:read' })
  getById(@CurrentPublicTenant() tenant: TenantResourceContext, @Param('id') id: string) {
    return this.webhooks.getById(tenant, id);
  }

  @Post()
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:write' })
  create(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @CurrentAccess() access: AccessContext,
    @Body(new ZodValidationPipe(registerWebhookSchema)) input: RegisterWebhookInput,
  ) {
    return this.webhooks.create(tenant, toActor(access), input);
  }

  @Patch(':id')
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:write' })
  update(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @CurrentAccess() access: AccessContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWebhookSchema)) input: UpdateWebhookInput,
  ) {
    return this.webhooks.update(tenant, toActor(access), id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:write' })
  async remove(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @CurrentAccess() access: AccessContext,
    @Param('id') id: string,
  ) {
    await this.webhooks.remove(tenant, toActor(access), id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:write' })
  sendTestEvent(@CurrentPublicTenant() tenant: TenantResourceContext, @Param('id') id: string) {
    return this.webhooks.sendTestEvent(tenant, id);
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:write' })
  rotateSecret(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @CurrentAccess() access: AccessContext,
    @Param('id') id: string,
  ) {
    return this.webhooks.rotateSecret(tenant, toActor(access), id);
  }

  @Get(':id/deliveries')
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:read' })
  listDeliveries(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(listWebhookDeliveriesQuerySchema))
    query: ListWebhookDeliveriesQuery,
  ) {
    return this.webhooks.listDeliveries(tenant, id, query);
  }

  @Post(':id/deliveries/:deliveryId/retry')
  @HttpCode(HttpStatus.OK)
  @PublicScoped({ role: MembershipRole.ADMIN, scope: 'webhooks:write' })
  retryDelivery(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @CurrentAccess() access: AccessContext,
    @Param('id') id: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooks.retryDelivery(tenant, toActor(access), id, deliveryId);
  }
}
