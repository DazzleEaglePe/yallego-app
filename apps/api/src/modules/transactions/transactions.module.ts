import { Module } from '@nestjs/common';

import { CryptoModule } from '../../infrastructure/crypto/crypto.module';
import { AccessPolicyGuard } from '../../shared/guards/access-policy.guard';
import { ApiKeyRateLimitGuard } from '../../shared/guards/api-key-rate-limit.guard';
import { PublicApiAuthGuard } from '../../shared/guards/public-api-auth.guard';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [AuthModule, CryptoModule, ApiKeysModule, PlansModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, PublicApiAuthGuard, ApiKeyRateLimitGuard, AccessPolicyGuard],
  exports: [TransactionsService],
})
export class TransactionsModule {}
