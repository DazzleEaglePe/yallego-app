import { generateKeyPairSync, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

/**
 * Cubre el backend de dispositivos del Sprint 3: vinculación, token de
 * dispositivo, señal de vida, configuración remota, límite de plan y
 * revocación (docs/06_API_CONTRACT.md §5 y §13).
 */
integrationDescribe('Devices backend', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `dueno-dev-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceOfflineEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceRecoveredEmail: vi.fn().mockResolvedValue(undefined),
  };
  let ownerToken: string;

  beforeAll(async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
      publicKeyEncoding: { format: 'pem', type: 'spki' },
    });
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    // Redis es real y compartida entre corridas: sin un prefijo único, jobs
    // huérfanos de una corrida anterior (o de otro archivo) contaminarían esta.
    process.env.BULLMQ_PREFIX = `test-${suffix}`;
    process.env.JWT_PRIVATE_KEY = Buffer.from(privateKey).toString('base64');
    process.env.JWT_PUBLIC_KEY = Buffer.from(publicKey).toString('base64');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: ownerEmail,
        password,
        full_name: 'Dueña de Prueba',
        business_name: `Bodega Dispositivos ${suffix}`,
      });
    const verificationToken = mailer.sendVerificationEmail.mock.calls[0]?.[0].token as string;
    await request(app.getHttpServer())
      .post('/v1/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);
    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: ownerEmail, password })
      .expect(200);
    ownerToken = login.body.access_token as string;
  }, 30_000);

  afterAll(async () => {
    await prisma.withoutTenantScope(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: ownerEmail },
        include: { memberships: true },
      });
      if (!user) return;
      const tenantId = user.memberships[0]?.tenantId;
      if (tenantId) {
        await tx.tenant.delete({ where: { id: tenantId } });
      }
      await tx.user.delete({ where: { id: user.id } });
    });
    await app.close();
  });

  it('rejects a pairing attempt before any wallet is enabled and before pairing', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send({ code: 'ZZZZ-ZZZZ', device: { manufacturer: 'Xiaomi', model: 'Redmi Note 12' } })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  }, 30_000);

  it('activates a wallet from the catalog', async () => {
    const catalog = await request(app.getHttpServer())
      .get('/v1/wallets/catalog')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(catalog.body.find((w: { code: string }) => w.code === 'YAPE')).toBeTruthy();

    const activated = await request(app.getHttpServer())
      .post('/v1/wallets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wallet_code: 'YAPE', account_reference: '00112233' })
      .expect(201);
    expect(activated.body.wallet.code).toBe('YAPE');
    expect(activated.body.account_reference).toBe('***2233');
  }, 30_000);

  it('pairs a device with a generated code and receives monitored packages', async () => {
    const pairingCode = await request(app.getHttpServer())
      .post('/v1/devices/pairing-codes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Celular caja principal' })
      .expect(201);
    expect(pairingCode.body.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const pairResponse = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send({
        code: pairingCode.body.code,
        device: {
          manufacturer: 'Xiaomi',
          model: 'Redmi Note 12',
          os_version: '13',
          app_version: '1.0.0',
        },
      })
      .expect(201);
    expect(pairResponse.body.device_token).toMatch(/^dvt_/);
    expect(pairResponse.body.monitored_packages).toContain('com.bcp.innovacxion.yapeapp');

    const deviceToken = pairResponse.body.device_token as string;

    const reuse = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send({ code: pairingCode.body.code, device: {} })
      .expect(400);
    expect(reuse.body.error.code).toBe('VALIDATION_ERROR');

    const heartbeat = await request(app.getHttpServer())
      .post('/internal/v1/heartbeat')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ app_version: '1.0.1', queue_size: 0 })
      .expect(200);
    expect(heartbeat.body.monitored_packages).toContain('com.bcp.innovacxion.yapeapp');

    const config = await request(app.getHttpServer())
      .get('/internal/v1/config')
      .set('Authorization', `Bearer ${deviceToken}`)
      .expect(200);
    expect(config.body.heartbeat_interval_seconds).toBe(300);
    expect(config.body.ingest_batch_size).toBe(50);

    const devices = await request(app.getHttpServer())
      .get('/v1/devices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(devices.body).toHaveLength(1);
    expect(devices.body[0].connectivity).toBe('ONLINE');
    expect(devices.body[0].app_version).toBe('1.0.1');

    const deviceId = devices.body[0].id as string;

    await request(app.getHttpServer())
      .delete(`/v1/devices/${deviceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    const revokedHeartbeat = await request(app.getHttpServer())
      .post('/internal/v1/heartbeat')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({})
      .expect(401);
    expect(revokedHeartbeat.body.error.code).toBe('UNAUTHENTICATED');
  }, 30_000);

  it('enforces the plan device limit when generating a pairing code', async () => {
    const secondCode = await request(app.getHttpServer())
      .post('/v1/devices/pairing-codes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Segundo celular' })
      .expect(201);

    const paired = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send({ code: secondCode.body.code, device: { manufacturer: 'Samsung' } })
      .expect(201);
    expect(paired.body.device_token).toMatch(/^dvt_/);

    // El plan FREE admite un solo dispositivo activo; el anterior fue revocado
    // en la prueba previa, así que este segundo cabe. Un tercero debe rechazarse.
    const thirdCode = await request(app.getHttpServer())
      .post('/v1/devices/pairing-codes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Tercer celular' })
      .expect(422);
    expect(thirdCode.body.error.code).toBe('PLAN_LIMIT_EXCEEDED');
  }, 30_000);

  it('pauses and resumes a device, logging both actions in the audit trail', async () => {
    const devices = await request(app.getHttpServer())
      .get('/v1/devices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const deviceId = devices.body.find((device: { status: string }) => device.status === 'ACTIVE')
      .id as string;

    const paused = await request(app.getHttpServer())
      .patch(`/v1/devices/${deviceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'PAUSED' })
      .expect(200);
    expect(paused.body.status).toBe('PAUSED');

    const resumed = await request(app.getHttpServer())
      .patch(`/v1/devices/${deviceId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(resumed.body.status).toBe('ACTIVE');

    const user = await prisma.withoutTenantScope((tx) =>
      tx.user.findUniqueOrThrow({ where: { email: ownerEmail }, include: { memberships: true } }),
    );
    const tenantId = user.memberships[0]!.tenantId;
    const events = await prisma.withTenant(tenantId, (tx) =>
      tx.auditEvent.findMany({
        where: {
          tenantId,
          resourceType: 'device',
          resourceId: deviceId,
          action: { in: ['devices.paused', 'devices.resumed'] },
        },
        orderBy: { createdAt: 'asc' },
      }),
    );
    expect(events.map((event) => event.action)).toEqual(['devices.paused', 'devices.resumed']);
  }, 30_000);
});
