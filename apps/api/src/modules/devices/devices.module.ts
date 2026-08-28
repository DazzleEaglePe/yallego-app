import { Module } from '@nestjs/common';

import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { AccessPolicyGuard } from '../../shared/guards/access-policy.guard';
import { ApiKeyRateLimitGuard } from '../../shared/guards/api-key-rate-limit.guard';
import { DeviceTokenGuard } from '../../shared/guards/device-token.guard';
import { PublicApiAuthGuard } from '../../shared/guards/public-api-auth.guard';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { DeviceGatewayController } from './device-gateway.controller';
import { DeviceGatewayService } from './device-gateway.service';
import { DeviceOfflineScheduler } from './device-offline.scheduler';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [MailerModule, AuthModule, ApiKeysModule, PlansModule],
  controllers: [DevicesController, DeviceGatewayController],
  providers: [
    DevicesService,
    DeviceGatewayService,
    DeviceOfflineScheduler,
    DeviceTokenGuard,
    PublicApiAuthGuard,
    ApiKeyRateLimitGuard,
    AccessPolicyGuard,
  ],
})
export class DevicesModule {}
