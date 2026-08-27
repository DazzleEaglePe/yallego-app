import { describe, expect, it } from 'vitest';

import { registerSchema } from './auth.schemas';

describe('registerSchema', () => {
  it('normalizes an email and accepts the approved registration contract', () => {
    const registration = registerSchema.parse({
      email: '  DUENO@NEGOCIO.PE  ',
      password: 'una-clave-segura',
      full_name: 'María Quispe',
      business_name: 'Bodega Santa Rosa',
    });

    expect(registration.email).toBe('dueno@negocio.pe');
  });

  it('rejects short passwords and undeclared fields', () => {
    expect(() =>
      registerSchema.parse({
        email: 'dueno@negocio.pe',
        password: 'corta',
        full_name: 'María Quispe',
        business_name: 'Bodega Santa Rosa',
        role: 'OWNER',
      }),
    ).toThrow();
  });
});
