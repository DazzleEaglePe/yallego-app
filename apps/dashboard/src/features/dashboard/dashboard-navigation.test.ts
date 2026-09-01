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

  it('muestra toda la configuración y la membresía al propietario', () => {
    expect(getVisibleNavigation('OWNER').map((item) => item.label)).toEqual([
      'Inicio',
      'Transacciones',
      'Dispositivos',
      'Billeteras',
      'Equipo',
      'Integraciones',
      'Membresía',
      'Auditoría',
    ]);
  });

  it('oculta la membresía al administrador', () => {
    expect(getVisibleNavigation('ADMIN').map((item) => item.label)).toEqual([
      'Inicio',
      'Transacciones',
      'Dispositivos',
      'Billeteras',
      'Equipo',
      'Integraciones',
      'Auditoría',
    ]);
  });

  it('habilita la ruta de billeteras solo para roles con permiso', () => {
    expect(getVisibleNavigation('OWNER').find((item) => item.label === 'Billeteras')?.href).toBe(
      '/billeteras',
    );
    expect(getVisibleNavigation('VIEWER').some((item) => item.label === 'Billeteras')).toBe(false);
  });
});
