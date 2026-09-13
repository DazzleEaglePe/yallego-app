import type { ApiKeyScope } from './api-keys.schemas.js';

export interface ApiKeySummary {
  id: string;
  label: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKeySummary {
  /** Solo presente en la respuesta de creación; nunca se recupera después. */
  key: string;
}
