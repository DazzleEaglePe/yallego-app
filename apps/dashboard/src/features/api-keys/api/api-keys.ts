import type { ApiKeyCreated, ApiKeySummary, CreateApiKeyInput } from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function fetchApiKeys(accessToken: string): Promise<ApiKeySummary[]> {
  return authenticatedRequest('/api-keys', accessToken);
}

export function createApiKey(
  accessToken: string,
  input: CreateApiKeyInput,
): Promise<ApiKeyCreated> {
  return authenticatedRequest('/api-keys', accessToken, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function revokeApiKey(accessToken: string, apiKeyId: string): Promise<void> {
  return authenticatedRequest(`/api-keys/${apiKeyId}`, accessToken, { method: 'DELETE' });
}
