import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * RNF-OBS-002: métricas de aplicación en formato estándar (Prometheus text
 * exposition format), servidas por `MetricsController` en `GET /metrics`.
 * Un único registro compartido por toda la aplicación — cada módulo que
 * necesita reportar algo inyecta este servicio en vez de crear su propio
 * `Registry`, para que `GET /metrics` los exponga todos juntos.
 */
@Injectable()
export class MetricsService implements OnModuleDestroy {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'yallego_http_requests_total',
    help: 'Solicitudes HTTP procesadas, por método, ruta y código de estado.',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDurationSeconds = new Histogram({
    name: 'yallego_http_request_duration_seconds',
    help: 'Duración de las solicitudes HTTP, por método, ruta y código de estado.',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly ingestNotificationsTotal = new Counter({
    name: 'yallego_ingest_notifications_total',
    help: 'Notificaciones recibidas en /internal/v1/ingest, por resultado.',
    labelNames: ['status'] as const,
    registers: [this.registry],
  });

  readonly parsingResultsTotal = new Counter({
    name: 'yallego_parsing_results_total',
    help: 'Resultados de intentos de parsing, por billetera y resultado.',
    labelNames: ['wallet_code', 'result'] as const,
    registers: [this.registry],
  });

  readonly webhookDeliveriesTotal = new Counter({
    name: 'yallego_webhook_deliveries_total',
    help: 'Intentos de entrega de webhook finalizados, por resultado.',
    labelNames: ['result'] as const,
    registers: [this.registry],
  });

  readonly webhookQueueDepth = new Gauge({
    name: 'yallego_webhook_queue_depth',
    help: 'Trabajos en espera en la cola de entrega de webhooks, última lectura.',
    registers: [this.registry],
  });

  readonly parsingSuccessRate = new Gauge({
    name: 'yallego_parsing_success_rate',
    help: 'Tasa de éxito de parsing por billetera en la ventana evaluada más reciente (0-1).',
    labelNames: ['wallet_code'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'yallego_' });
  }

  onModuleDestroy(): void {
    this.registry.clear();
  }
}
