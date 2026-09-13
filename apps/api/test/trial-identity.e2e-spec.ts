import { generateKeyPairSync, randomUUID, sign, type KeyObject } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import { TrialIdentityRolloutService } from '../src/modules/devices/trial-identity-rollout.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe('Trial identity enforcement', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const password = 'clave-super-segura-1';
  const emails = [`trial-a-${suffix}@negocio.pe`, `trial-b-${suffix}@negocio.pe`];
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceOfflineEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceRecoveredEmail: vi.fn().mockResolvedValue(undefined),
  };
  const installationKeyPair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

  beforeAll(async () => {
    const jwt = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
      publicKeyEncoding: { format: 'pem', type: 'spki' },
    });
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.BULLMQ_PREFIX = `test-trial-identity-${suffix}`;
    process.env.JWT_PRIVATE_KEY = Buffer.from(jwt.privateKey).toString('base64');
    process.env.JWT_PUBLIC_KEY = Buffer.from(jwt.publicKey).toString('base64');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .overrideProvider(TrialIdentityRolloutService)
      .useValue({ modeFor: () => 'ENFORCE' })
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
    prisma = app.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    await prisma.withoutTenantScope(async (tx) => {
      const users = await tx.user.findMany({
        where: { email: { in: emails } },
        include: { memberships: true },
      });
      const tenantIds = users.flatMap((user) => user.memberships.map((item) => item.tenantId));
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await tx.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    });
    await app.close();
  });

  it('rejects another tenant while allowing the original tenant to pair again', async () => {
    const first = await createTenant(emails[0]!, 'Negocio A');
    const firstCode = await createPairingCode(first.token);
    const firstPair = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send(pairPayload(firstCode))
      .expect(201);

    const claims = await prisma.withoutTenantScope((tx) =>
      tx.trialIdentityClaim.findMany({ where: { tenantId: first.tenantId } }),
    );
    expect(claims).toHaveLength(2);
    expect(claims.every((claim) => claim.valueHash.startsWith('v1:'))).toBe(true);
    expect(claims.some((claim) => claim.valueHash.includes('android-id-shared'))).toBe(false);

    const second = await createTenant(emails[1]!, 'Negocio B');
    const secondCode = await createPairingCode(second.token);
    const rejected = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send(pairPayload(secondCode))
      .expect(403);
    expect(rejected.body.error.code).toBe('TRIAL_ALREADY_USED');

    await request(app.getHttpServer())
      .delete(`/v1/devices/${firstPair.body.device_id}`)
      .set('Authorization', `Bearer ${first.token}`)
      .expect(204);
    const replacementCode = await createPairingCode(first.token);
    await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send(pairPayload(replacementCode))
      .expect(201);
  }, 30_000);

  async function createTenant(email: string, businessName: string) {
    const verificationCall = mailer.sendVerificationEmail.mock.calls.length;
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password, full_name: 'Dueña Trial', business_name: businessName })
      .expect(201);
    const verificationToken = mailer.sendVerificationEmail.mock.calls[verificationCall]?.[0]
      .token as string;
    await request(app.getHttpServer())
      .post('/v1/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const token = login.body.access_token as string;
    const tenantId = login.body.tenants[0].id as string;
    await request(app.getHttpServer())
      .post('/v1/wallets')
      .set('Authorization', `Bearer ${token}`)
      .send({ wallet_code: 'YAPE' })
      .expect(201);
    return { token, tenantId };
  }

  async function createPairingCode(token: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/v1/devices/pairing-codes')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Equipo de prueba' })
      .expect(201);
    return response.body.code as string;
  }

  function pairPayload(code: string) {
    const publicKey = installationKeyPair.publicKey
      .export({ format: 'der', type: 'spki' })
      .toString('base64');
    const device = {
      manufacturer: 'Google',
      model: 'Pixel',
      os_version: '16',
      app_version: '1.2.3',
    };
    const installationId = '7e125dea-c6d2-4bd6-9d89-a2f0351a0aaa';
    const androidId = 'android-id-shared';
    const payload = [
      'v1',
      code,
      installationId,
      androidId,
      publicKey,
      device.manufacturer,
      device.model,
      device.os_version,
      device.app_version,
    ].join('\n');
    return {
      code,
      device,
      identity: {
        installation_id: installationId,
        android_id: androidId,
        public_key: publicKey,
        request_signature: signPayload(payload, installationKeyPair.privateKey),
      },
    };
  }
});

function signPayload(payload: string, privateKey: KeyObject): string {
  return sign('sha256', Buffer.from(payload), privateKey).toString('base64');
}
