import type { WebhookEndpointSummary, WebhookEventType } from '@yallego/contracts';

export const webhookEventOptions = [
  { label: 'Cobro recibido', value: 'transaction.created' },
  { label: 'Cobro confirmado', value: 'transaction.confirmed' },
  { label: 'Cobro disputado', value: 'transaction.disputed' },
  { label: 'Dispositivo desconectado', value: 'device.offline' },
  { label: 'Dispositivo conectado', value: 'device.online' },
  { label: 'Notificación no reconocida', value: 'notification.unmatched' },
] satisfies Array<{ label: string; value: WebhookEventType }>;

const eventLabels = Object.fromEntries(
  webhookEventOptions.map((event) => [event.value, event.label]),
) as Record<WebhookEventType, string>;

export function webhookEventLabel(event: WebhookEventType): string {
  return eventLabels[event];
}

export function webhookHealth(
  webhook: WebhookEndpointSummary,
): 'disabled' | 'failing' | 'healthy' | 'new' {
  if (!webhook.is_enabled) return 'disabled';
  if (webhook.consecutive_failures > 0) return 'failing';
  if (webhook.last_success_at) return 'healthy';
  return 'new';
}
