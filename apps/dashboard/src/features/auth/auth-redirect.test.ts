import { describe, expect, it } from 'vitest';

import { resolvePostLoginPath } from './auth-redirect';

describe('resolvePostLoginPath', () => {
  it('preserva una ruta interna', () => {
    expect(resolvePostLoginPath('/cuenta')).toBe('/cuenta');
  });

  it.each(['https://evil.example', '//evil.example', null])(
    'rechaza destinos externos o ausentes: %s',
    (value) => {
      expect(resolvePostLoginPath(value)).toBe('/inicio');
    },
  );
});
