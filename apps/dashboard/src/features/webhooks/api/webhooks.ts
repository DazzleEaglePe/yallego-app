import type {
  RegisterWebhookInput,
  UpdateWebhookInput,
  WebhookEndpointCreated,
  WebhookEndpointSummary,
} from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function fetchWebhooks(accessToken: string): Promise<WebhookEndpointSummary[]> {
  return authenticatedRequest('/webhooks', accessToken);
}

export function createWebhook(
  accessToken: string,
  input: RegisterWebhookInput,
): Promise<WebhookEndpointCreated> {
  return authenticatedRequest('/webhooks', accessToken, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function updateWebhook(
  accessToken: string,
  webhookId: string,
  input: UpdateWebhookInput,
): Promise<WebhookEndpointSummary> {
  return authenticatedRequest(`/webhooks/${webhookId}`, accessToken, {
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export function deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
  return authenticatedRequest(`/webhooks/${webhookId}`, accessToken, { method: 'DELETE' });
}

export function sendWebhookTest(
  accessToken: string,
  webhookId: string,
): Promise<{ delivery_id: string }> {
  return authenticatedRequest(`/webhooks/${webhookId}/test`, accessToken, { method: 'POST' });
}

export function rotateWebhookSecret(
  accessToken: string,
  webhookId: string,
): Promise<WebhookEndpointCreated> {
  return authenticatedRequest(`/webhooks/${webhookId}/rotate-secret`, accessToken, {
    method: 'POST',
  });
}
