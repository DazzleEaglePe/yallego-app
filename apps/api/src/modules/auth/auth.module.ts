import { Module } from '@nestjs/common';

import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { AccessTokenGuard } from '../../shared/guards/access-token.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [MailerModule],
  controllers: [AuthController],
  providers: [
    AccessTokenGuard,
    TenantGuard,
    RolesGuard,
    AuthService,
    PasswordService,
    TokenService,
  ],
  exports: [AuthService, TokenService, AccessTokenGuard, TenantGuard, RolesGuard, PasswordService],
})
export class AuthModule {}
