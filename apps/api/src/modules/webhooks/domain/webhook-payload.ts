import { randomUUID } from 'node:crypto';

import type { WebhookEventType } from '@yallego/contracts';

/** docs/06_API_CONTRACT.md §9.1: sin dependencias externas, se prueba con datos puros. */
export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  api_version: 'v1';
  created_at: string;
  data: Record<string, unknown>;
}

export function buildWebhookPayload(
  eventId: string,
  type: WebhookEventType,
  data: Record<string, unknown>,
): WebhookPayload {
  return {
    id: eventId,
    type,
    api_version: 'v1',
    created_at: new Date().toISOString(),
    data,
  };
}

export function newEventId(): string {
  return randomUUID();
}
