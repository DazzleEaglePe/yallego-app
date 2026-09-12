import { Module } from '@nestjs/common';

import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { AuthModule } from '../auth/auth.module';
import { PlansModule } from '../plans/plans.module';
import { InvitationsController } from './invitations.controller';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [MailerModule, AuthModule, PlansModule],
  controllers: [MembersController, InvitationsController],
  providers: [MembersService],
})
export class MembersModule {}
