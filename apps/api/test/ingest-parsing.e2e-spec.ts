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

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

/**
 * Extremo a extremo del Sprint 4: una notificación de Yape entra por
 * `/internal/v1/ingest` y sale como una `Transaction` real, pasando por la
 * cola de BullMQ y el worker de parsing (docs/04_ARQUITECTURA_SOFTWARE.md §5.1).
 */
integrationDescribe('Ingest and parsing pipeline', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cipher: EncryptionService;
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `dueno-parsing-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceOfflineEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceRecoveredEmail: vi.fn().mockResolvedValue(undefined),
  };
  let ownerToken: string;
  let deviceToken: string;

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
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
    prisma = app.get(PrismaService);
    cipher = app.get(EncryptionService);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: ownerEmail,
        password,
        full_name: 'Dueña de Prueba',
        business_name: `Bodega Parsing ${suffix}`,
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

    await request(app.getHttpServer())
      .post('/v1/wallets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wallet_code: 'YAPE' })
      .expect(201);

    const pairingCode = await request(app.getHttpServer())
      .post('/v1/devices/pairing-codes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Celular de prueba' })
      .expect(201);
    const paired = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send({
        code: pairingCode.body.code,
        device: { manufacturer: 'Xiaomi', model: 'Redmi Note 12' },
      })
      .expect(201);
    deviceToken = paired.body.device_token as string;
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

  it('parses a real-shaped Yape notification into a transaction with the sender name encrypted', async () => {
    const postedAt = new Date().toISOString();
    const ingest = await request(app.getHttpServer())
      .post('/internal/v1/ingest')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        notifications: [
          {
            client_ref: 'local-1',
            package_name: 'com.bcp.innovacxion.yapeapp',
            title: 'Yape!',
            body: 'Te Yapearon S/ 35.50 de JUAN CARLOS PEREZ R. Código de seguridad: 247',
            posted_at: postedAt,
          },
        ],
      })
      .expect(202);

    expect(ingest.body.accepted).toHaveLength(1);
    expect(ingest.body.accepted[0].status).toBe('QUEUED');
    const notificationId = ingest.body.accepted[0].notification_id as string;

    const transaction = await waitForTransaction(prisma, notificationId);

    expect(transaction).not.toBeNull();
    expect(Number(transaction!.amount)).toBe(35.5);
    expect(transaction!.securityCode).toBe('247');
    expect(transaction!.senderNameSearch).toBe('JUAN CARLOS PEREZ R.');
    expect(cipher.decrypt(transaction!.senderNameEncrypted!)).toBe('JUAN CARLOS PEREZ R.');
  }, 15_000);

  it('does not duplicate a transaction when the same notification is retried', async () => {
    const postedAt = new Date().toISOString();
    const payload = {
      client_ref: 'local-2',
      package_name: 'com.bcp.innovacxion.yapeapp',
      title: 'Yape!',
      body: 'Te Yapearon S/ 12.00 de MARIA LOPEZ. Código de seguridad: 555',
      posted_at: postedAt,
    };

    const first = await request(app.getHttpServer())
      .post('/internal/v1/ingest')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ notifications: [payload] })
      .expect(202);
    expect(first.body.accepted[0].status).toBe('QUEUED');
    await waitForTransaction(prisma, first.body.accepted[0].notification_id);

    const retry = await request(app.getHttpServer())
      .post('/internal/v1/ingest')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ notifications: [payload] })
      .expect(202);
    expect(retry.body.accepted[0].status).toBe('DUPLICATE');
    expect(retry.body.accepted[0].notification_id).toBe(first.body.accepted[0].notification_id);
  }, 15_000);

  it('marks a notification with no matching parser as UNMATCHED for review', async () => {
    const ingest = await request(app.getHttpServer())
      .post('/internal/v1/ingest')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        notifications: [
          {
            client_ref: 'local-3',
            package_name: 'com.bcp.innovacxion.yapeapp',
            title: 'Yape!',
            body: 'Tu saldo Yape es S/ 120.00',
            posted_at: new Date().toISOString(),
          },
        ],
      })
      .expect(202);

    const notificationId = ingest.body.accepted[0].notification_id as string;
    const raw = await waitForRawNotificationStatus(prisma, notificationId, 'UNMATCHED');
    expect(raw?.parseStatus).toBe('UNMATCHED');
    expect(raw?.parseError).toBeTruthy();
  }, 15_000);
});

async function waitForTransaction(
  prisma: PrismaService,
  rawNotificationId: string,
  timeoutMs = 8_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const transaction = await prisma.withoutTenantScope((tx) =>
      tx.transaction.findUnique({ where: { rawNotificationId } }),
    );
    if (transaction) return transaction;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

async function waitForRawNotificationStatus(
  prisma: PrismaService,
  rawNotificationId: string,
  status: string,
  timeoutMs = 8_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const raw = await prisma.withoutTenantScope((tx) =>
      tx.rawNotification.findUnique({ where: { id: rawNotificationId } }),
    );
    if (raw?.parseStatus === status) return raw;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}
