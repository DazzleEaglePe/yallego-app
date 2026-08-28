import { describe, expect, it } from 'vitest';

import { getVisibleNavigation } from './dashboard-navigation';

describe('getVisibleNavigation', () => {
  it.each(['OPERATOR', 'VIEWER'] as const)(
    'oculta las secciones de configuración para %s',
    (role) => {
      expect(getVisibleNavigation(role).map((item) => item.label)).toEqual([
        'Inicio',
        'Transacciones',
      ]);
    },
  );

  it.each(['OWNER', 'ADMIN'] as const)('muestra las secciones de configuración para %s', (role) => {
    expect(getVisibleNavigation(role).map((item) => item.label)).toEqual([
      'Inicio',
      'Transacciones',
      'Dispositivos',
      'Billeteras',
      'Equipo',
      'Integraciones',
    ]);
  });
});
