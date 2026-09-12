/**
 * RNF-OBS-003: trazas distribuidas en los flujos críticos (ingesta, parsing,
 * entrega de webhooks). Debe ser el PRIMER import de `main.ts` — la
 * instrumentación automática de OpenTelemetry parchea módulos (`http`,
 * `express`, `ioredis`) en el momento en que se hace `require()` de ellos;
 * si este archivo se cargara después, ya sería tarde para interceptarlos.
 *
 * Sin `OTEL_EXPORTER_OTLP_ENDPOINT` configurado, las trazas se generan
 * igual (spans manuales incluidos) pero no se exportan a ningún colector —
 * no hay uno desplegado todavía (Sprint 8 de despliegue, diferido). Esto
 * deja la instrumentación lista para cuando exista.
 */
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const isProduction = process.env.NODE_ENV === 'production';

// En pruebas automatizadas no tiene sentido instrumentar ni imprimir spans
// por consola en cada corrida — solo se activa fuera de `test`.
if (process.env.NODE_ENV !== 'test') {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'yallego-api',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? 'dev',
    }),
    traceExporter: otlpEndpoint
      ? new OTLPTraceExporter({ url: otlpEndpoint })
      : isProduction
        ? undefined // producción sin colector configurado: no genera ruido, pero deja los spans manuales disponibles como no-op
        : new ConsoleSpanExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        // El propio scraping de métricas y el liveness check no aportan
        // valor como traza y generarían ruido constante.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk.shutdown();
  });
}
