import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from '../../../config/env.schema';
import { computeSignature } from '../domain/webhook-signature';
import type { WebhookPayload } from '../domain/webhook-payload';

export interface WebhookSendResult {
  ok: boolean;
  /** true si el destino respondió 410 Gone: la política es deshabilitar el endpoint de inmediato, no reintentar. */
  gone: boolean;
  statusCode: number | null;
  error: string | null;
}

/**
 * El cuerpo que se firma es EXACTAMENTE el que se envía (serializado una
 * sola vez) — firmar y luego re-serializar el mismo objeto podría producir
 * bytes distintos y romper la verificación en el receptor.
 */
@Injectable()
export class HttpWebhookDispatcher {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Environment, true>) {}

  async send(
    url: string,
    deliveryId: string,
    payload: WebhookPayload,
    secrets: { current: string; previous?: string },
  ): Promise<WebhookSendResult> {
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Yallego-Webhooks/1.0',
      'X-Yallego-Event-Id': payload.id,
      'X-Yallego-Event-Type': payload.type,
      'X-Yallego-Delivery-Id': deliveryId,
      'X-Yallego-Timestamp': String(timestamp),
      'X-Yallego-Signature': `sha256=${computeSignature(secrets.current, timestamp, rawBody)}`,
    };
    // Extensión no documentada en docs/06_API_CONTRACT.md §9.2 (que solo
    // define una firma): durante la ventana de rotación se agrega una
    // segunda cabecera firmada con el secreto anterior para que el
    // integrador no pierda entregas mientras actualiza su verificación.
    if (secrets.previous) {
      headers['X-Yallego-Signature-Previous'] =
        `sha256=${computeSignature(secrets.previous, timestamp, rawBody)}`;
    }

    const timeoutMs = this.config.get('WEBHOOK_TIMEOUT_MS', { infer: true });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: rawBody,
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error',
      });
      return {
        ok: response.status >= 200 && response.status < 300,
        gone: response.status === HttpStatus.GONE,
        statusCode: response.status,
        error: null,
      };
    } catch (error) {
      return {
        ok: false,
        gone: false,
        statusCode: null,
        error: String(error instanceof Error ? error.message : error),
      };
    }
  }
}
