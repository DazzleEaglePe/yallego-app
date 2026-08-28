import { Body, Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ingestNotificationsSchema, type IngestNotificationsInput } from '@yallego/contracts';

import { CurrentDevice } from '../../../shared/decorators/current-device.decorator';
import { DeviceTokenGuard, type DeviceContext } from '../../../shared/guards/device-token.guard';
import { ZodValidationPipe } from '../../../shared/pipes/zod-validation.pipe';
import { IngestNotificationsUseCase } from '../application/ingest-notifications.usecase';

@Controller('internal/v1')
export class IngestController {
  constructor(
    @Inject(IngestNotificationsUseCase)
    private readonly ingestNotifications: IngestNotificationsUseCase,
  ) {}

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(DeviceTokenGuard)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  ingest(
    @CurrentDevice() device: DeviceContext,
    @Body(new ZodValidationPipe(ingestNotificationsSchema)) input: IngestNotificationsInput,
  ) {
    return this.ingestNotifications.execute(device, input);
  }
}
