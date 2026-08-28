import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  listUnmatchedNotificationsQuerySchema,
  reprocessNotificationsSchema,
  type ListUnmatchedNotificationsQuery,
  type ReprocessNotificationsInput,
} from '@yallego/contracts';

import { CurrentPlatformAdmin } from '../platform-auth/current-platform-admin.decorator';
import { PlatformAuthGuard, type PlatformAdminContext } from '../platform-auth/platform-auth.guard';
import { PlatformIpAllowlistGuard } from '../platform-auth/platform-ip-allowlist.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { PlatformNotificationsService } from './platform-notifications.service';

@Controller('platform/v1/notifications')
@UseGuards(PlatformIpAllowlistGuard, PlatformAuthGuard)
export class PlatformNotificationsController {
  constructor(
    @Inject(PlatformNotificationsService)
    private readonly notifications: PlatformNotificationsService,
  ) {}

  @Get('unmatched')
  listUnmatched(
    @Query(new ZodValidationPipe(listUnmatchedNotificationsQuerySchema))
    query: ListUnmatchedNotificationsQuery,
  ) {
    return this.notifications.listUnmatched(query);
  }

  @Post('reprocess')
  @HttpCode(HttpStatus.OK)
  reprocess(
    @CurrentPlatformAdmin() admin: PlatformAdminContext,
    @Body(new ZodValidationPipe(reprocessNotificationsSchema)) input: ReprocessNotificationsInput,
  ) {
    return this.notifications.reprocess(input.raw_notification_ids, admin.id);
  }
}
