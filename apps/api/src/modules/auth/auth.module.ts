import { Module } from '@nestjs/common';

import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { AccessTokenGuard } from '../../shared/guards/access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [MailerModule],
  controllers: [AuthController],
  providers: [AccessTokenGuard, AuthService, PasswordService, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
