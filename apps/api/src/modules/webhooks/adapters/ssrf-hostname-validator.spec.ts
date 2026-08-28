import { describe, expect, it } from 'vitest';

import { SsrfHostnameValidator } from './ssrf-hostname-validator';

// `localhost` siempre resuelve local y sin red (no depende de conectividad
// del entorno de pruebas), a diferencia de un dominio público real.
describe('SsrfHostnameValidator', () => {
  const validator = new SsrfHostnameValidator();

  it('rejects a hostname that resolves to loopback', async () => {
    await expect(validator.assertPublicHostname('https://localhost/hook')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects a hostname that fails to resolve', async () => {
    await expect(
      validator.assertPublicHostname('https://this-domain-does-not-exist.invalid/hook'),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
