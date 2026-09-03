import type { ApiKeyScope, ApiKeySummary } from '@yallego/contracts';

export const apiKeyScopeOptions = [
  { description: 'Consultar cobros y su estado.', label: 'Leer transacciones', value: 'transactions:read' },
  { description: 'Confirmar o disputar cobros.', label: 'Gestionar transacciones', value: 'transactions:write' },
  { description: 'Consultar dispositivos vinculados.', label: 'Leer dispositivos', value: 'devices:read' },
  { description: 'Consultar endpoints y entregas.', label: 'Leer webhooks', value: 'webhooks:read' },
  { description: 'Crear y modificar webhooks.', label: 'Gestionar webhooks', value: 'webhooks:write' },
  { description: 'Suscribirse al canal en tiempo real.', label: 'Tiempo real', value: 'realtime:subscribe' },
] satisfies Array<{ description: string; label: string; value: ApiKeyScope }>;

const scopeLabels = Object.fromEntries(
  apiKeyScopeOptions.map((scope) => [scope.value, scope.label]),
) as Record<ApiKeyScope, string>;

export function apiKeyScopeLabel(scope: ApiKeyScope): string {
  return scopeLabels[scope];
}

export function apiKeyStatus(key: ApiKeySummary, now = Date.now()): 'active' | 'expired' {
  return key.expires_at !== null && new Date(key.expires_at).getTime() <= now ? 'expired' : 'active';
}
