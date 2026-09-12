import { describe, expect, it } from 'vitest';

import type { ApiKeySummary } from '@yallego/contracts';

import { apiKeyScopeLabel, apiKeyStatus } from './api-key-config';

const key: ApiKeySummary = {
  created_at: '2026-08-01T00:00:00.000Z',
  expires_at: null,
  id: 'key-1',
  key_prefix: 'yk_live_example',
  label: 'ERP',
  last_used_at: null,
  scopes: ['transactions:read'],
};

describe('apiKeyStatus', () => {
  it('mantiene activa una clave sin vencimiento', () => {
    expect(apiKeyStatus(key, Date.parse('2026-08-28T00:00:00.000Z'))).toBe('active');
  });

  it('marca una clave vencida', () => {
    expect(
      apiKeyStatus(
        { ...key, expires_at: '2026-08-27T00:00:00.000Z' },
        Date.parse('2026-08-28T00:00:00.000Z'),
      ),
    ).toBe('expired');
  });
});

describe('apiKeyScopeLabel', () => {
  it('presenta alcances técnicos con una etiqueta legible', () => {
    expect(apiKeyScopeLabel('realtime:subscribe')).toBe('Tiempo real');
  });
});
