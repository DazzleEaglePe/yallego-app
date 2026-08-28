import { Module } from '@nestjs/common';

import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { AuthModule } from '../auth/auth.module';
import { PlanChangeApplicationService } from './plan-change-application.service';
import { PlanLimitsService } from './plan-limits.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { RetentionScheduler } from './retention.scheduler';
import { SubscriptionPeriodScheduler } from './subscription-period.scheduler';
import { UsageCounterService } from './usage-counter.service';

@Module({
  imports: [MailerModule, AuthModule],
  controllers: [PlansController],
  providers: [
    PlanLimitsService,
    UsageCounterService,
    PlansService,
    PlanChangeApplicationService,
    SubscriptionPeriodScheduler,
    RetentionScheduler,
  ],
  exports: [PlanLimitsService, UsageCounterService, PlanChangeApplicationService],
})
export class PlansModule {}
