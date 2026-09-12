import type { WebhookEventType } from './webhooks.schemas.js';

export type DeliveryStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'FAILED' | 'ABANDONED';

export interface WebhookEndpointSummary {
  id: string;
  url: string;
  subscribed_events: WebhookEventType[];
  description: string | null;
  is_enabled: boolean;
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  created_at: string;
}

export interface WebhookEndpointCreated extends WebhookEndpointSummary {
  /** Solo presente en la respuesta de creación y en la rotación; nunca se recupera después. */
  secret: string;
}

export interface WebhookDeliverySummary {
  id: string;
  event_id: string;
  event_type: WebhookEventType;
  status: DeliveryStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_attempt_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface WebhookDeliveryListResponse {
  data: WebhookDeliverySummary[];
}
