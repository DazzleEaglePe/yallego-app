import { describe, expect, it } from 'vitest';

import { registerSchema, updateProfileSchema } from './auth.schemas';

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

describe('updateProfileSchema', () => {
  it('normaliza el nombre visible', () => {
    expect(updateProfileSchema.parse({ full_name: '  María Quispe  ' })).toEqual({
      full_name: 'María Quispe',
    });
  });

  it('rechaza nombres demasiado cortos', () => {
    expect(updateProfileSchema.safeParse({ full_name: 'M' }).success).toBe(false);
  });
});
