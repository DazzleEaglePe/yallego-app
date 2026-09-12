import { describe, expect, it } from 'vitest';

import { auditActionLabel, auditActorLabel, auditResourceLabel } from './audit-config';

describe('audit labels', () => {
  it('presenta eventos conocidos en lenguaje de negocio', () => {
    expect(auditActionLabel('webhooks.secret_rotated')).toBe('Secreto de webhook rotado');
    expect(auditActorLabel('API_KEY')).toBe('Clave de API');
    expect(auditResourceLabel('device')).toBe('Dispositivos');
  });

  it('mantiene legibles los valores nuevos del backend', () => {
    expect(auditActionLabel('tenant.settings_changed')).toBe('Tenant settings changed');
  });
});
