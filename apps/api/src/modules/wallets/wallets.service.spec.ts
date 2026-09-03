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

describe('WalletsService tenant lifecycle', () => {
  const wallet = {
    id: 'wallet-1',
    code: 'YAPE',
    displayName: 'Yape',
    provider: 'BCP',
    issuer: 'BCP',
    isActive: true,
  };

  it('checks the plan limit and audits a wallet reactivation', async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const tenantWalletUpdate = vi.fn().mockResolvedValue({
      id: 'tenant-wallet-1',
      wallet,
      isEnabled: true,
      accountReference: null,
      enabledAt: new Date('2026-09-03T08:00:00.000Z'),
    });
    const tx = {
      auditEvent: { create: auditCreate },
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ plan: { limits: { wallets: 2 } } }),
      },
      tenantWallet: {
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue({ id: 'tenant-wallet-1', isEnabled: false }),
        update: tenantWalletUpdate,
      },
    };
    const assertWithin = vi.fn();
    const service = new WalletsService(
      {
        wallet: { findFirst: vi.fn().mockResolvedValue(wallet) },
        withTenant: vi.fn((_tenantId, operation) => operation(tx)),
      } as never,
      { assertWithin } as never,
    );

    await service.activateWallet({ id: 'tenant-1' } as never, { wallet_code: 'YAPE' });

    expect(assertWithin).toHaveBeenCalledWith(
      { wallets: 2 },
      'wallets',
      1,
      'Se alcanzó el límite de billeteras del plan actual.',
    );
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'wallets.activated',
        metadata: { wallet_code: 'YAPE', reactivated: true },
        resourceId: 'tenant-wallet-1',
      }),
    });
  });

  it('audits configuration changes without storing the account reference in metadata', async () => {
    const auditCreate = vi.fn().mockResolvedValue({});
    const tx = {
      auditEvent: { create: auditCreate },
      tenantWallet: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'tenant-wallet-1',
          tenantId: 'tenant-1',
          isEnabled: true,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'tenant-wallet-1',
          wallet,
          isEnabled: true,
          accountReference: '123456789',
          enabledAt: new Date('2026-09-03T08:00:00.000Z'),
        }),
      },
    };
    const service = new WalletsService(
      { withTenant: vi.fn((_tenantId, operation) => operation(tx)) } as never,
      {} as never,
    );

    await service.updateWallet({ id: 'tenant-1' } as never, 'tenant-wallet-1', {
      account_reference: '123456789',
    });

    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'wallets.updated',
        metadata: { wallet_code: 'YAPE', changed_fields: ['account_reference'] },
      }),
    });
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain('123456789');
  });
});
