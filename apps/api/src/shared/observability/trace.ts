import { SpanStatusCode, trace, type Attributes } from '@opentelemetry/api';

const tracer = trace.getTracer('yallego-api');

/**
 * RNF-OBS-003: envoltura común para instrumentar un flujo crítico con un
 * span manual. Registra la excepción en el span (si la hay) y siempre lo
 * cierra — evita repetir el boilerplate de `startActiveSpan`/`try`/`finally`
 * en ingesta, parsing y entrega de webhooks.
 */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : String(error));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
