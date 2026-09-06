import { describe, expect, it, vi } from 'vitest';

import { DevicesService } from './devices.service';

describe('DevicesService.createPairingCode', () => {
  it('requires an enabled wallet before creating a pairing code', async () => {
    const pairingCodeCreate = vi.fn();
    const tx = {
      tenantWallet: { count: vi.fn().mockResolvedValue(0) },
      pairingCode: { create: pairingCodeCreate },
    };
    const service = new DevicesService(
      { withTenant: vi.fn((_tenantId, operation) => operation(tx)) } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createPairingCode({ id: 'tenant-1' } as never, 'user-1', {
        label: 'Android de caja',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Activa al menos una billetera antes de vincular un dispositivo.',
      status: 422,
    });
    expect(pairingCodeCreate).not.toHaveBeenCalled();
  });
});
