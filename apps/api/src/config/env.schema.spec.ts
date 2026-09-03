import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './env.schema';

const productionSecrets = {
  NODE_ENV: 'production',
  JWT_PRIVATE_KEY: 'test-private-key',
  JWT_PUBLIC_KEY: 'test-public-key',
  ENCRYPTION_KEY: 'test-encryption-key',
};

describe('production logging configuration', () => {
  it('accepts an operational log level', () => {
    expect(validateEnvironment({ ...productionSecrets, LOG_LEVEL: 'info' }).LOG_LEVEL).toBe('info');
  });

  it.each(['debug', 'trace'])('rejects %s in production', (level) => {
    expect(() => validateEnvironment({ ...productionSecrets, LOG_LEVEL: level })).toThrow(
      'LOG_LEVEL debe ser info, warn, error o fatal en producción.',
    );
  });
});

describe('CORS configuration', () => {
  it('parses and validates additional allowed origins', () => {
    expect(
      validateEnvironment({
        CORS_ALLOWED_ORIGINS: 'http://localhost:3010, https://preview.yallego.app',
      }).CORS_ALLOWED_ORIGINS,
    ).toEqual(['http://localhost:3010', 'https://preview.yallego.app']);
  });

  it('rejects malformed origins', () => {
    expect(() => validateEnvironment({ CORS_ALLOWED_ORIGINS: 'not-a-url' })).toThrow(
      'Configuración inválida',
    );
  });
});
