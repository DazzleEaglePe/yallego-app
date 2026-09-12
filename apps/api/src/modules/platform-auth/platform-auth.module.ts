import { Module } from '@nestjs/common';

import { CryptoModule } from '../../infrastructure/crypto/crypto.module';
import { AuthModule } from '../auth/auth.module';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthGuard } from './platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformIpAllowlistGuard } from './platform-ip-allowlist.guard';
import { PlatformTenantsController } from './platform-tenants.controller';
import { PlatformTenantsService } from './platform-tenants.service';

@Module({
  imports: [AuthModule, CryptoModule],
  controllers: [PlatformAuthController, PlatformTenantsController],
  providers: [
    PlatformAuthService,
    PlatformTenantsService,
    PlatformAuthGuard,
    PlatformIpAllowlistGuard,
  ],
  exports: [PlatformAuthGuard, PlatformIpAllowlistGuard],
})
export class PlatformAuthModule {}
