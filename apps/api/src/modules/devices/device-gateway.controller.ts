import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  deviceHeartbeatSchema,
  pairDeviceSchema,
  type DeviceHeartbeatInput,
  type PairDeviceInput,
} from '@yallego/contracts';

import { CurrentDevice } from '../../shared/decorators/current-device.decorator';
import { DeviceTokenGuard, type DeviceContext } from '../../shared/guards/device-token.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { DeviceGatewayService } from './device-gateway.service';

/**
 * Superficie interna que consume la app Android (`docs/06_API_CONTRACT.md` §13).
 * Vive fuera de `/v1`: la vinculación no tiene credencial previa, y el resto
 * usa el token de dispositivo, nunca la sesión del panel.
 */
@Controller('internal/v1')
export class DeviceGatewayController {
  constructor(
    @Inject(DeviceGatewayService) private readonly deviceGatewayService: DeviceGatewayService,
  ) {}

  @Post('devices/pair')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  pairDevice(@Body(new ZodValidationPipe(pairDeviceSchema)) input: PairDeviceInput) {
    return this.deviceGatewayService.pairDevice(input);
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(DeviceTokenGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  heartbeat(
    @CurrentDevice() device: DeviceContext,
    @Body(new ZodValidationPipe(deviceHeartbeatSchema)) input: DeviceHeartbeatInput,
  ) {
    return this.deviceGatewayService.heartbeat(device, input);
  }

  @Get('config')
  @UseGuards(DeviceTokenGuard)
  getConfig(@CurrentDevice() device: DeviceContext) {
    return this.deviceGatewayService.getConfig(device);
  }
}
