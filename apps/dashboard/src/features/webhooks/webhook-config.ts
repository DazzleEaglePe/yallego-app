import type { DeliveryStatus, WebhookEndpointSummary, WebhookEventType } from '@yallego/contracts';

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

export const deliveryStatusOptions = [
  { label: 'Todas', value: undefined },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'En proceso', value: 'IN_PROGRESS' },
  { label: 'Entregadas', value: 'DELIVERED' },
  { label: 'Fallidas', value: 'FAILED' },
  { label: 'Abandonadas', value: 'ABANDONED' },
] satisfies Array<{ label: string; value: DeliveryStatus | undefined }>;

export const deliveryStatusMeta: Record<DeliveryStatus, { className: string; label: string }> = {
  ABANDONED: {
    className: 'bg-neutral-200 text-neutral-700',
    label: 'Abandonada',
  },
  DELIVERED: {
    className: 'bg-success-50 text-success-700',
    label: 'Entregada',
  },
  FAILED: {
    className: 'bg-danger-50 text-danger-700',
    label: 'Fallida',
  },
  IN_PROGRESS: {
    className: 'bg-brand-50 text-brand-700',
    label: 'En proceso',
  },
  PENDING: {
    className: 'bg-warning-50 text-warning-700',
    label: 'Pendiente',
  },
};

export function canRetryDelivery(status: DeliveryStatus): boolean {
  return status === 'FAILED' || status === 'ABANDONED';
}
