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
  inviteMemberSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  type InviteMemberInput,
  type TransferOwnershipInput,
  type UpdateMemberRoleInput,
} from '@yallego/contracts';

import { CurrentSession } from '../../shared/decorators/current-session.decorator';
import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { TenantScoped } from '../../shared/decorators/tenant-scoped.decorator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import type { AccessTokenPayload } from '../auth/auth.types';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(@Inject(MembersService) private readonly membersService: MembersService) {}

  @Get()
  @TenantScoped(MembershipRole.VIEWER)
  listMembers(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
  ) {
    return this.membersService.listMembers(tenant, session.sub);
  }

  @Get('invitations')
  @TenantScoped(MembershipRole.ADMIN)
  listInvitations(@CurrentTenant() tenant: TenantContext) {
    return this.membersService.listInvitations(tenant);
  }

  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @TenantScoped(MembershipRole.ADMIN)
  inviteMember(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Body(new ZodValidationPipe(inviteMemberSchema)) input: InviteMemberInput,
  ) {
    return this.membersService.inviteMember(tenant, session.sub, input);
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @TenantScoped(MembershipRole.ADMIN)
  revokeInvitation(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Param('id') invitationId: string,
  ) {
    return this.membersService.revokeInvitation(tenant, session.sub, invitationId);
  }

  @Post('transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @TenantScoped(MembershipRole.OWNER)
  transferOwnership(
    @CurrentTenant() tenant: TenantContext,
    @Body(new ZodValidationPipe(transferOwnershipSchema)) input: TransferOwnershipInput,
  ) {
    return this.membersService.transferOwnership(tenant, tenant.membershipId, input);
  }

  @Patch(':id')
  @TenantScoped(MembershipRole.OWNER)
  updateMemberRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('id') memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) input: UpdateMemberRoleInput,
  ) {
    return this.membersService.updateMemberRole(tenant, tenant.membershipId, memberId, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @TenantScoped(MembershipRole.ADMIN)
  removeMember(
    @CurrentTenant() tenant: TenantContext,
    @CurrentSession() session: AccessTokenPayload,
    @Param('id') memberId: string,
  ) {
    return this.membersService.removeMember(tenant, session.sub, memberId);
  }
}
