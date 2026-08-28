import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { ApiKeyVerifier } from './api-key-verifier';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

@Module({
  imports: [AuthModule, PlansModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyVerifier],
  exports: [ApiKeyVerifier],
})
export class ApiKeysModule {}
