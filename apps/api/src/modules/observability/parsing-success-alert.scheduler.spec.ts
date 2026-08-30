import { ParseStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ParsingSuccessAlertScheduler } from './parsing-success-alert.scheduler';

describe('ParsingSuccessAlertScheduler', () => {
  const groupBy = vi.fn();
  const findAdmins = vi.fn();
  const findWallets = vi.fn();
  const redisSet = vi.fn();
  const sendPlatformAlertEmail = vi.fn();
  const setMetric = vi.fn();
  const configGet = vi.fn();
  const tx = {
    rawNotification: { groupBy },
    platformAdmin: { findMany: findAdmins },
  };
  const prisma = {
    withoutTenantScope: vi.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    wallet: { findMany: findWallets },
  };

  let scheduler: ParsingSuccessAlertScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    configGet.mockImplementation((key: string) =>
      key === 'PARSING_ALERT_MIN_SAMPLE_SIZE' ? 20 : 0.95,
    );
    findWallets.mockResolvedValue([{ androidPackage: 'com.yape.app', code: 'YAPE' }]);
    findAdmins.mockResolvedValue([
      { email: 'ops-1@yallego.app', fullName: 'Ops Uno' },
      { email: 'ops-2@yallego.app', fullName: 'Ops Dos' },
    ]);
    sendPlatformAlertEmail.mockResolvedValue(undefined);

    scheduler = new ParsingSuccessAlertScheduler(
      prisma as never,
      { set: redisSet } as never,
      { sendPlatformAlertEmail } as never,
      { parsingSuccessRate: { set: setMetric } } as never,
      { get: configGet } as never,
    );
  });

  it('alerts platform admins when parsing falls below 95%', async () => {
    groupBy.mockResolvedValue([
      { packageName: 'com.yape.app', parseStatus: ParseStatus.PARSED, _count: { _all: 90 } },
      { packageName: 'com.yape.app', parseStatus: ParseStatus.ERROR, _count: { _all: 10 } },
    ]);
    redisSet.mockResolvedValue('OK');

    await scheduler.checkParsingSuccessRate();

    expect(setMetric).toHaveBeenCalledWith({ wallet_code: 'YAPE' }, 0.9);
    expect(redisSet).toHaveBeenCalledWith('alert:parsing-success:YAPE', '1', 'EX', 3600, 'NX');
    expect(sendPlatformAlertEmail).toHaveBeenCalledTimes(2);
    expect(sendPlatformAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ops-1@yallego.app',
        subject: 'Tasa de parsing de YAPE por debajo del umbral',
        message: expect.stringContaining('90 de 100'),
      }),
    );
  });

  it('does not resend the alert while its Redis deduplication key exists', async () => {
    groupBy.mockResolvedValue([
      { packageName: 'com.yape.app', parseStatus: ParseStatus.PARSED, _count: { _all: 18 } },
      { packageName: 'com.yape.app', parseStatus: ParseStatus.UNMATCHED, _count: { _all: 2 } },
    ]);
    redisSet.mockResolvedValue(null);

    await scheduler.checkParsingSuccessRate();

    expect(redisSet).toHaveBeenCalledOnce();
    expect(findAdmins).not.toHaveBeenCalled();
    expect(sendPlatformAlertEmail).not.toHaveBeenCalled();
  });

  it('records but does not alert a rate at the configured threshold', async () => {
    groupBy.mockResolvedValue([
      { packageName: 'com.yape.app', parseStatus: ParseStatus.PARSED, _count: { _all: 95 } },
      { packageName: 'com.yape.app', parseStatus: ParseStatus.ERROR, _count: { _all: 5 } },
    ]);

    await scheduler.checkParsingSuccessRate();

    expect(setMetric).toHaveBeenCalledWith({ wallet_code: 'YAPE' }, 0.95);
    expect(redisSet).not.toHaveBeenCalled();
    expect(sendPlatformAlertEmail).not.toHaveBeenCalled();
  });
});
