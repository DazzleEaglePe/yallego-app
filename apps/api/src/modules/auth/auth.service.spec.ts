import { describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';

describe('AuthService.resendVerificationEmail', () => {
  it('replaces pending verification tokens and sends a fresh email', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'owner@business.pe',
          fullName: 'María',
          emailVerified: false,
        }),
      },
      oneTimeToken: {
        updateMany: vi.fn().mockReturnValue({ operation: 'update' }),
        create: vi.fn().mockReturnValue({ operation: 'create' }),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    const tokenService = {
      createOpaqueToken: vi.fn().mockReturnValue('ev-raw-token'),
      hashOpaqueToken: vi.fn().mockReturnValue('hashed-token'),
    };
    const mailer = { sendVerificationEmail: vi.fn().mockResolvedValue(undefined) };
    const service = new AuthService(
      prisma as never,
      {} as never,
      tokenService as never,
      mailer as never,
    );

    const result = await service.resendVerificationEmail({ email: 'owner@business.pe' });

    expect(prisma.oneTimeToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1', consumedAt: null }),
      }),
    );
    expect(prisma.oneTimeToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tokenHash: 'hashed-token' }) }),
    );
    expect(mailer.sendVerificationEmail).toHaveBeenCalledWith({
      email: 'owner@business.pe',
      fullName: 'María',
      token: 'ev-raw-token',
    });
    expect(result.message).toContain('pendiente de verificación');
  });

  it('does not reveal or email an already verified account', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'owner@business.pe',
          fullName: 'María',
          emailVerified: true,
        }),
      },
      oneTimeToken: { updateMany: vi.fn(), create: vi.fn() },
      $transaction: vi.fn(),
    };
    const mailer = { sendVerificationEmail: vi.fn() };
    const service = new AuthService(
      prisma as never,
      {} as never,
      {} as never,
      mailer as never,
    );

    const result = await service.resendVerificationEmail({ email: 'owner@business.pe' });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
    expect(result.message).toContain('pendiente de verificación');
  });
});

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
