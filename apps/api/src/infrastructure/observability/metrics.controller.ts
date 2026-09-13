import { Controller, Get, Header, Inject } from '@nestjs/common';

import { MetricsService } from './metrics.service';

/**
 * Sin autenticación de aplicación a propósito: es la convención estándar de
 * scraping de Prometheus (el propio Prometheus no manda credenciales de
 * negocio). El aislamiento se resuelve a nivel de red en producción — este
 * puerto/ruta no debe exponerse fuera de la red del clúster de scraping,
 * igual que `/platform/v1` se protege con lista blanca de IP en vez de
 * autenticación de aplicación para su superficie de mayor privilegio.
 */
@Controller('metrics')
export class MetricsController {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metrics.registry.metrics();
  }
}
