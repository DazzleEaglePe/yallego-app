import { Module } from '@nestjs/common';

import { QueueModule } from '../../infrastructure/queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { ParsingModule } from '../parsing/parsing.module';
import { PlansModule } from '../plans/plans.module';
import { PlatformAuthGuard } from '../platform-auth/platform-auth.guard';
import { PlatformAuthModule } from '../platform-auth/platform-auth.module';
import { PlatformIpAllowlistGuard } from '../platform-auth/platform-ip-allowlist.guard';
import { PlatformBillingController } from './platform-billing.controller';
import { PlatformMetricsController } from './platform-metrics.controller';
import { PlatformMetricsService } from './platform-metrics.service';
import { PlatformNotificationsController } from './platform-notifications.controller';
import { PlatformNotificationsService } from './platform-notifications.service';
import { PlatformParsersController } from './platform-parsers.controller';
import { PlatformParsersService } from './platform-parsers.service';
import { PlatformWalletsController } from './platform-wallets.controller';
import { PlatformWalletsService } from './platform-wallets.service';

@Module({
  imports: [PlatformAuthModule, AuthModule, QueueModule, ParsingModule, PlansModule],
  controllers: [
    PlatformParsersController,
    PlatformNotificationsController,
    PlatformWalletsController,
    PlatformBillingController,
    PlatformMetricsController,
  ],
  providers: [
    PlatformParsersService,
    PlatformNotificationsService,
    PlatformWalletsService,
    PlatformMetricsService,
    PlatformAuthGuard,
    PlatformIpAllowlistGuard,
  ],
})
export class PlatformAdminModule {}
