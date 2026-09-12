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
  createPairingCodeSchema,
  updateDeviceSchema,
  type CreatePairingCodeInput,
  type UpdateDeviceInput,
} from '@yallego/contracts';

import { CurrentPublicTenant } from '../../shared/decorators/current-public-tenant.decorator';
import { CurrentSession } from '../../shared/decorators/current-session.decorator';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { PublicScoped } from '../../shared/decorators/public-scoped.decorator';
import { TenantScoped } from '../../shared/decorators/tenant-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import type { TenantContext, TenantResourceContext } from '../../shared/guards/tenant.guard';
import type { AccessTokenPayload } from '../auth/auth.types';
import { DevicesService } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(@Inject(DevicesService) private readonly devicesService: DevicesService) {}

  @Get()
  @PublicScoped({ role: MembershipRole.VIEWER, scope: 'devices:read' })
  listDevices(@CurrentPublicTenant() tenant: TenantResourceContext) {
    return this.devicesService.listDevices(tenant);
  }

  @Get(':id')
  @PublicScoped({ role: MembershipRole.VIEWER, scope: 'devices:read' })
  getDevice(@CurrentPublicTenant() tenant: TenantResourceContext, @Param('id') deviceId: string) {
    return this.devicesService.getDevice(tenant, deviceId);
  }

  @Post('pairing-codes')
  @HttpCode(HttpStatus.CREATED)
  @TenantScoped(MembershipRole.ADMIN)
  createPairingCode(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Body(new ZodValidationPipe(createPairingCodeSchema)) input: CreatePairingCodeInput,
  ) {
    return this.devicesService.createPairingCode(tenant, session.sub, input);
  }

  @Patch(':id')
  @TenantScoped(MembershipRole.ADMIN)
  updateDevice(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Param('id') deviceId: string,
    @Body(new ZodValidationPipe(updateDeviceSchema)) input: UpdateDeviceInput,
  ) {
    return this.devicesService.updateDevice(tenant, session.sub, deviceId, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @TenantScoped(MembershipRole.ADMIN)
  revokeDevice(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Param('id') deviceId: string,
  ) {
    return this.devicesService.revokeDevice(tenant, session.sub, deviceId);
  }
}
