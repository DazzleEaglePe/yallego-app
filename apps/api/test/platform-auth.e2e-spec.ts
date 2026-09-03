import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { EncryptionService } from '../src/infrastructure/crypto/encryption.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import { PasswordService } from '../src/modules/auth/password.service';
import { computeTotp, generateTotpSecret } from '../src/modules/platform-auth/totp';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe('Platform administration: authentication and tenant management', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const adminEmail = `admin-plataforma-${suffix}@yallego.internal`;
  const adminPassword = 'clave-super-segura-de-administrador-1';
  let totpSecret: Buffer;
  let adminId: string;
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceOfflineEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceRecoveredEmail: vi.fn().mockResolvedValue(undefined),
    sendWebhookDisabledEmail: vi.fn().mockResolvedValue(undefined),
    sendUsageThresholdEmail: vi.fn().mockResolvedValue(undefined),
    sendPlanChangeEmail: vi.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
      publicKeyEncoding: { format: 'pem', type: 'spki' },
    });
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.JWT_PRIVATE_KEY = Buffer.from(privateKey).toString('base64');
    process.env.JWT_PUBLIC_KEY = Buffer.from(publicKey).toString('base64');
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
    process.env.BULLMQ_PREFIX = `test-platform-${suffix}`;
    // Cubre ambas pilas (IPv4/IPv6): una conexión local en distintos entornos
    // se reporta como cualquiera de las dos.
    process.env.PLATFORM_ALLOWED_IPS = '127.0.0.1,::1,::ffff:127.0.0.1';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
    prisma = app.get(PrismaService);

    const passwordService = app.get(PasswordService);
    const cipher = app.get(EncryptionService);
    const { secret } = generateTotpSecret();
    totpSecret = secret;

    const admin = await prisma.platformAdmin.create({
      data: {
        email: adminEmail,
        fullName: 'Administradora de Prueba',
        passwordHash: await passwordService.hash(adminPassword),
        totpSecret: Buffer.from(cipher.encrypt(secret.toString('base64'))),
      },
    });
    adminId = admin.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.platformAdmin.delete({ where: { id: adminId } });
    await app.close();
  });

  function currentTotp(): string {
    return computeTotp(totpSecret);
  }

  it('rejects requests from an IP outside the allowlist, before any credential is checked', async () => {
    // `ConfigModule` cachea las variables de entorno al primer acceso: no
    // sirve mutar `process.env` sobre la app ya compilada. Se levanta una
    // instancia aparte, desechable, con una lista bloqueante desde el arranque.
    const originalAllowedIps = process.env.PLATFORM_ALLOWED_IPS;
    process.env.PLATFORM_ALLOWED_IPS = '203.0.113.5';
    const blockedIpsModuleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();
    const blockedApp = blockedIpsModuleRef.createNestApplication();
    configureApplication(blockedApp, 'http://localhost:3000');
    await blockedApp.init();

    try {
      const response = await request(blockedApp.getHttpServer())
        .post('/platform/v1/auth/login')
        .send({ email: adminEmail, password: 'anything', totp_code: '000000' })
        .expect(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    } finally {
      await blockedApp.close();
      process.env.PLATFORM_ALLOWED_IPS = originalAllowedIps;
    }
  });

  it('rejects a wrong password without revealing which factor failed', async () => {
    const response = await request(app.getHttpServer())
      .post('/platform/v1/auth/login')
      .send({
        email: adminEmail,
        password: 'clave-incorrecta-cualquiera',
        totp_code: currentTotp(),
      })
      .expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a wrong TOTP code even with the correct password', async () => {
    const response = await request(app.getHttpServer())
      .post('/platform/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword, totp_code: '000000' })
      .expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('locks the account after 5 failed attempts within the window', async () => {
    for (let i = 0; i < 3; i += 1) {
      await request(app.getHttpServer())
        .post('/platform/v1/auth/login')
        .send({ email: adminEmail, password: 'sigue-incorrecta', totp_code: '000000' })
        .expect(401);
    }
    // Van 5 intentos fallidos contando los dos casos anteriores de este archivo.
    const locked = await request(app.getHttpServer())
      .post('/platform/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword, totp_code: currentTotp() })
      .expect(429);
    expect(locked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(locked.body.error.details.locked_until).toBeTruthy();

    await prisma.platformAdmin.update({
      where: { id: adminId },
      data: { failedAttempts: 0, failedAttemptsStartedAt: null, lockedUntil: null },
    });
  });

  it('logs in with the correct password and TOTP code, and can renew the session by activity', async () => {
    const login = await request(app.getHttpServer())
      .post('/platform/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword, totp_code: currentTotp() })
      .expect(200);
    expect(login.body.access_token).toBeTruthy();
    expect(login.body.expires_in).toBe(30 * 60);
    expect(login.body.admin.email).toBe(adminEmail);

    const refreshed = await request(app.getHttpServer())
      .post('/platform/v1/auth/refresh')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);
    expect(refreshed.body.access_token).toBeTruthy();
    expect(refreshed.body.access_token).not.toBe(login.body.access_token);
  });

  it('rejects a tenant panel access token on platform routes, and vice versa', async () => {
    const owner = await registerTenantOwner(app, mailer, `platform-cross-${suffix}`);
    await request(app.getHttpServer())
      .get('/platform/v1/tenants')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(401);

    const platformLogin = await request(app.getHttpServer())
      .post('/platform/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword, totp_code: currentTotp() })
      .expect(200);
    await request(app.getHttpServer())
      .get('/v1/subscription')
      .set('Authorization', `Bearer ${platformLogin.body.access_token}`)
      .expect(401);

    await prisma.withoutTenantScope((tx) => tx.tenant.delete({ where: { id: owner.tenantId } }));
    await prisma.withoutTenantScope((tx) => tx.user.deleteMany({ where: { email: owner.email } }));
  });

  describe('tenant management', () => {
    let platformToken: string;
    let tenantId: string;
    let ownerEmail: string;
    let ownerToken: string;

    beforeAll(async () => {
      const login = await request(app.getHttpServer())
        .post('/platform/v1/auth/login')
        .send({ email: adminEmail, password: adminPassword, totp_code: currentTotp() })
        .expect(200);
      platformToken = login.body.access_token as string;

      const owner = await registerTenantOwner(app, mailer, `platform-tenants-${suffix}`);
      tenantId = owner.tenantId;
      ownerEmail = owner.email;
      ownerToken = owner.token;
    });

    afterAll(async () => {
      await prisma.withoutTenantScope((tx) => tx.tenant.delete({ where: { id: tenantId } }));
      await prisma.withoutTenantScope((tx) => tx.user.deleteMany({ where: { email: ownerEmail } }));
    });

    it('lists and searches tenants', async () => {
      const all = await request(app.getHttpServer())
        .get('/platform/v1/tenants')
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);
      expect(all.body.data.some((tenant: { id: string }) => tenant.id === tenantId)).toBe(true);

      const found = await request(app.getHttpServer())
        .get(`/platform/v1/tenants?q=platform-tenants-${suffix}`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);
      expect(found.body.data).toHaveLength(1);
      expect(found.body.data[0].id).toBe(tenantId);
    });

    it('shows tenant detail including the owner email and plan', async () => {
      const detail = await request(app.getHttpServer())
        .get(`/platform/v1/tenants/${tenantId}`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);
      expect(detail.body.owner_email).toBe(ownerEmail);
      expect(detail.body.plan_code).toBe('FREE');
      expect(detail.body.member_count).toBe(1);
    });

    it('suspends a tenant, blocking its own panel access, then reactivates it, all logged with the admin as actor', async () => {
      const suspend = await request(app.getHttpServer())
        .patch(`/platform/v1/tenants/${tenantId}/status`)
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ status: 'SUSPENDED', reason: 'prueba automatizada' })
        .expect(200);
      expect(suspend.body.status).toBe('SUSPENDED');

      const blocked = await request(app.getHttpServer())
        .get('/v1/subscription')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
      expect(blocked.body.error.code).toBe('FORBIDDEN');

      const reactivate = await request(app.getHttpServer())
        .patch(`/platform/v1/tenants/${tenantId}/status`)
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);
      expect(reactivate.body.status).toBe('ACTIVE');

      const events = await prisma.withoutTenantScope((tx) =>
        tx.auditEvent.findMany({
          where: { tenantId, actorPlatformAdminId: adminId },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(events.map((event) => event.action)).toEqual([
        'platform.tenant_suspended',
        'platform.tenant_activated',
      ]);
      expect(events.every((event) => event.actorType === 'PLATFORM_ADMIN')).toBe(true);
      expect((events[0]?.metadata as { reason?: string } | null)?.reason).toBe(
        'prueba automatizada',
      );
    });
  });
});

async function registerTenantOwner(
  app: INestApplication,
  mailer: { sendVerificationEmail: { mock: { calls: unknown[][] } } },
  suffix: string,
) {
  const email = `dueno-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';

  await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({
      email,
      password,
      full_name: 'Dueña de Prueba',
      business_name: `Bodega ${suffix}`,
    });
  const verificationToken = (
    mailer.sendVerificationEmail.mock.calls.at(-1)?.[0] as { token: string }
  ).token;
  await request(app.getHttpServer())
    .post('/v1/auth/verify-email')
    .send({ token: verificationToken })
    .expect(200);
  const login = await request(app.getHttpServer())
    .post('/v1/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    email,
    token: login.body.access_token as string,
    tenantId: login.body.tenants[0].id as string,
  };
}
