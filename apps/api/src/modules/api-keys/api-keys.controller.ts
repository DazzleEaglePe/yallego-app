import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { createApiKeySchema, type CreateApiKeyInput } from '@yallego/contracts';

import { CurrentSession } from '../../shared/decorators/current-session.decorator';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { TenantScoped } from '../../shared/decorators/tenant-scoped.decorator';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import type { AccessTokenPayload } from '../auth/auth.types';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
export class ApiKeysController {
  constructor(@Inject(ApiKeysService) private readonly apiKeys: ApiKeysService) {}

  @Get()
  @TenantScoped(MembershipRole.ADMIN)
  list(@CurrentTenant() tenant: TenantContext) {
    return this.apiKeys.list(tenant);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @TenantScoped(MembershipRole.ADMIN)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Body(new ZodValidationPipe(createApiKeySchema)) input: CreateApiKeyInput,
  ) {
    return this.apiKeys.create(tenant, session.sub, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @TenantScoped(MembershipRole.ADMIN)
  revoke(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Param('id') apiKeyId: string,
  ) {
    return this.apiKeys.revoke(tenant, session.sub, apiKeyId);
  }
}
