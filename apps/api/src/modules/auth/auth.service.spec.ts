import { describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';

describe('AuthService.updateProfile', () => {
  it('updates and returns the visible name for the authenticated user', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'owner@business.pe',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'owner@business.pe',
          fullName: 'María Actualizada',
        }),
      },
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.updateProfile(
      { sub: 'user-1', email: 'owner@business.pe' } as never,
      { full_name: 'María Actualizada' },
    );

    expect(result.user.full_name).toBe('María Actualizada');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { fullName: 'María Actualizada' },
    });
  });

  it('rejects a session that no longer matches the user', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.updateProfile(
        { sub: 'missing-user', email: 'owner@business.pe' } as never,
        { full_name: 'María Actualizada' },
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
