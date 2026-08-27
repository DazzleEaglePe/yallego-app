import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@yallego/contracts';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'yallego-api',
      timestamp: new Date().toISOString(),
    };
  }
}
