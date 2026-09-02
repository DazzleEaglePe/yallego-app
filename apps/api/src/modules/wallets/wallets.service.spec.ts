import { describe, expect, it, vi } from 'vitest';

import { WalletsService } from './wallets.service';

describe('WalletsService catalog availability', () => {
  it('lists only active wallets that have an active parser', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new WalletsService({ wallet: { findMany } } as never, {} as never);

    await expect(service.listCatalog()).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        parserPatterns: { some: { isActive: true } },
      },
      orderBy: { displayName: 'asc' },
    });
  });

  it('rejects activation when the wallet has no operational parser', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new WalletsService({ wallet: { findFirst } } as never, {} as never);

    await expect(
      service.activateWallet({ id: 'tenant-1' } as never, { wallet_code: 'NOT_READY' }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Esa billetera no está disponible o todavía no cuenta con un parser operativo.',
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        code: 'NOT_READY',
        isActive: true,
        parserPatterns: { some: { isActive: true } },
      },
    });
  });
});
