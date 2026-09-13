import { describe, expect, it } from 'vitest';

import type { WebhookEndpointSummary } from '@yallego/contracts';

import { canRetryDelivery, webhookEventLabel, webhookHealth } from './webhook-config';

const webhook: WebhookEndpointSummary = {
  consecutive_failures: 0,
  created_at: '2026-08-28T00:00:00.000Z',
  description: null,
  id: 'webhook-1',
  is_enabled: true,
  last_failure_at: null,
  last_success_at: null,
  subscribed_events: ['transaction.created'],
  url: 'https://example.com/webhook',
};

describe('webhookHealth', () => {
  it('distingue endpoints nuevos, saludables, con fallos y pausados', () => {
    expect(webhookHealth(webhook)).toBe('new');
    expect(webhookHealth({ ...webhook, last_success_at: '2026-08-28T01:00:00.000Z' })).toBe(
      'healthy',
    );
    expect(webhookHealth({ ...webhook, consecutive_failures: 2 })).toBe('failing');
    expect(webhookHealth({ ...webhook, is_enabled: false })).toBe('disabled');
  });
});

describe('webhookEventLabel', () => {
  it('presenta el nombre de evento en lenguaje de negocio', () => {
    expect(webhookEventLabel('notification.unmatched')).toBe('Notificación no reconocida');
  });
});

describe('canRetryDelivery', () => {
  it('limita el reintento manual a entregas fallidas o abandonadas', () => {
    expect(canRetryDelivery('FAILED')).toBe(true);
    expect(canRetryDelivery('ABANDONED')).toBe(true);
    expect(canRetryDelivery('PENDING')).toBe(false);
    expect(canRetryDelivery('IN_PROGRESS')).toBe(false);
    expect(canRetryDelivery('DELIVERED')).toBe(false);
  });
});
