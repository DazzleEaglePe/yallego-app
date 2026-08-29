import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { EncryptionService } from '../src/infrastructure/crypto/encryption.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  TRANSACTION_CREATED_EVENT,
  TransactionCreatedEvent,
} from '../src/shared/events/transaction-created.event';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

integrationDescribe('Transactions and realtime gateway', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let baseUrl: string;
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `dueno-txn-${suffix}@negocio.pe`;
  const secondOwnerEmail = `dueno-realtime-b-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceOfflineEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceRecoveredEmail: vi.fn().mockResolvedValue(undefined),
  };
  let ownerToken: string;
  let secondOwnerToken: string;
  let tenantId: string;
  let secondTenantId: string;
  let deviceId: string;
  let deviceToken: string;
  let yapeWalletId: string;
  let plinWalletId: string;
  const transactionIds: string[] = [];

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
    process.env.BULLMQ_PREFIX = `test-${suffix}`;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);
    eventEmitter = app.get(EventEmitter2);
    const cipher = app.get(EncryptionService);

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: ownerEmail,
        password,
        full_name: 'Dueña de Prueba',
        business_name: `Bodega Transacciones ${suffix}`,
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
    tenantId = login.body.tenants[0].id as string;

    await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: secondOwnerEmail,
      password,
      full_name: 'Dueño de aislamiento realtime',
      business_name: `Bodega Realtime B ${suffix}`,
    });
    const secondVerification = mailer.sendVerificationEmail.mock.calls.find(
      ([input]) => input.email === secondOwnerEmail,
    )?.[0].token as string;
    await request(app.getHttpServer())
      .post('/v1/auth/verify-email')
      .send({ token: secondVerification })
      .expect(200);
    const secondLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: secondOwnerEmail, password })
      .expect(200);
    secondOwnerToken = secondLogin.body.access_token as string;
    secondTenantId = secondLogin.body.tenants[0].id as string;

    // El plan FREE admite una sola billetera; se sube a NEGOCIO para activar
    // YAPE y Plin BBVA en esta prueba.
    await prisma.withoutTenantScope(async (tx) => {
      const negocioPlan = await tx.plan.findUniqueOrThrow({ where: { code: 'NEGOCIO' } });
      await tx.subscription.updateMany({ where: { tenantId }, data: { planId: negocioPlan.id } });
    });

    await request(app.getHttpServer())
      .post('/v1/wallets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wallet_code: 'YAPE' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/v1/wallets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ wallet_code: 'PLIN_BBVA' })
      .expect(201);

    const pairingCode = await request(app.getHttpServer())
      .post('/v1/devices/pairing-codes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Celular de prueba' })
      .expect(201);
    const paired = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send({ code: pairingCode.body.code, device: { manufacturer: 'Xiaomi' } })
      .expect(201);
    deviceId = paired.body.device_id as string;
    deviceToken = paired.body.device_token as string;

    const yape = await prisma.wallet.findUniqueOrThrow({ where: { code: 'YAPE' } });
    const plin = await prisma.wallet.findUniqueOrThrow({ where: { code: 'PLIN_BBVA' } });
    yapeWalletId = yape.id;
    plinWalletId = plin.id;

    // Datos deterministas para filtros y resumen: creados directamente para
    // no depender del pipeline de parsing asíncrono en cada caso.
    const now = new Date();
    const seedData = [
      {
        walletId: yapeWalletId,
        amount: '35.50',
        status: 'CAPTURED',
        daysAgo: 0,
        sender: 'JUAN PEREZ',
      },
      {
        walletId: yapeWalletId,
        amount: '120.00',
        status: 'CAPTURED',
        daysAgo: 1,
        sender: 'MARIA LOPEZ',
      },
      {
        walletId: plinWalletId,
        amount: '50.00',
        status: 'CAPTURED',
        daysAgo: 2,
        sender: 'CARLOS RUIZ',
      },
      {
        walletId: plinWalletId,
        amount: '999.00',
        status: 'VOIDED',
        daysAgo: 3,
        sender: 'ANA TORRES',
      },
    ] as const;

    for (const item of seedData) {
      const occurredAt = new Date(now.getTime() - item.daysAgo * 24 * 60 * 60 * 1_000);
      const created = await prisma.withTenant(tenantId, async (tx) => {
        const rawNotification = await tx.rawNotification.create({
          data: {
            tenantId,
            deviceId,
            packageName: 'com.bcp.innovacxion.yapeapp',
            dedupeHash: randomUUID(),
            postedAt: occurredAt,
            parseStatus: 'PARSED',
          },
        });
        return tx.transaction.create({
          data: {
            tenantId,
            deviceId,
            walletId: item.walletId,
            rawNotificationId: rawNotification.id,
            amount: item.amount,
            status: item.status,
            occurredAt,
            senderNameEncrypted: cipher.encrypt(item.sender),
            senderNameSearch: cipher.buildSearchColumn(item.sender),
          },
        });
      });
      transactionIds.push(created.id);
    }
  }, 30_000);

  afterAll(async () => {
    await prisma.withoutTenantScope(async (tx) => {
      await tx.tenant.deleteMany({ where: { id: { in: [tenantId, secondTenantId] } } });
      await tx.user.deleteMany({ where: { email: { in: [ownerEmail, secondOwnerEmail] } } });
    });
    await app.close();
  });

  it('lists transactions and applies composable filters', async () => {
    const all = await request(app.getHttpServer())
      .get('/v1/transactions')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(all.body.data.length).toBeGreaterThanOrEqual(4);

    const yapeOnly = await request(app.getHttpServer())
      .get('/v1/transactions?wallet_code=YAPE')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(
      yapeOnly.body.data.every((t: { wallet: { code: string } }) => t.wallet.code === 'YAPE'),
    ).toBe(true);

    const amountRange = await request(app.getHttpServer())
      .get('/v1/transactions?min_amount=100&max_amount=200')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(amountRange.body.data).toHaveLength(1);
    expect(amountRange.body.data[0].amount).toBe('120.00');

    const voidedOnly = await request(app.getHttpServer())
      .get('/v1/transactions?status=VOIDED')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(voidedOnly.body.data).toHaveLength(1);
    expect(voidedOnly.body.data[0].sender_name).toBe('ANA TORRES');

    const searched = await request(app.getHttpServer())
      .get('/v1/transactions?search=MARIA')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(searched.body.data).toHaveLength(1);
    expect(searched.body.data[0].sender_name).toBe('MARIA LOPEZ');
  });

  it('paginates by cursor without gaps or duplicates', async () => {
    const seen = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;

    do {
      const response = await request(app.getHttpServer())
        .get(`/v1/transactions?limit=1${cursor ? `&cursor=${cursor}` : ''}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      for (const item of response.body.data) seen.add(item.id);
      cursor = response.body.pagination.next_cursor;
      pages += 1;
    } while (cursor && pages < 10);

    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('confirms a captured transaction and rejects confirming it twice', async () => {
    const target = transactionIds[0]!;
    const confirmed = await request(app.getHttpServer())
      .post(`/v1/transactions/${target}/confirm`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(200);
    expect(confirmed.body.status).toBe('CONFIRMED');
    expect(confirmed.body.confirmed_at).toBeTruthy();

    const secondAttempt = await request(app.getHttpServer())
      .post(`/v1/transactions/${target}/confirm`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(409);
    expect(secondAttempt.body.error.code).toBe('CONFLICT');
  });

  it('disputes a confirmed transaction but not a voided one', async () => {
    const confirmedTarget = transactionIds[0]!;
    const disputed = await request(app.getHttpServer())
      .post(`/v1/transactions/${confirmedTarget}/dispute`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ note: 'Cliente reporta no reconocer el cobro' })
      .expect(200);
    expect(disputed.body.status).toBe('DISPUTED');

    const voidedTarget = transactionIds[3]!;
    const rejected = await request(app.getHttpServer())
      .post(`/v1/transactions/${voidedTarget}/dispute`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(409);
    expect(rejected.body.error.code).toBe('CONFLICT');
  });

  it('returns 404, not 403, for a transaction outside the tenant', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/transactions/${randomUUID()}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('aggregates totals by wallet and by day in the summary', async () => {
    const summary = await request(app.getHttpServer())
      .get('/v1/transactions/summary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(summary.body.totals.count).toBeGreaterThanOrEqual(4);
    expect(summary.body.by_wallet.length).toBeGreaterThanOrEqual(2);
    expect(Number(summary.body.totals.amount)).toBeGreaterThan(0);
  });

  it('exports the filtered transactions as CSV', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/transactions/export?wallet_code=YAPE')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(response.headers['content-type']).toContain('text/csv');
    const lines = (response.text as string).trim().split('\n');
    expect(lines[0]).toContain('billetera');
    expect(lines.length - 1).toBe(2); // dos transacciones YAPE sembradas
  });

  it('delivers a transaction.created event over the tenant-scoped WebSocket channel', async () => {
    const socket: Socket = io(baseUrl, {
      path: '/v1/realtime',
      transports: ['websocket'],
      auth: { token: ownerToken },
      forceNew: true,
    });

    const connected = await new Promise<{ tenant_id: string; session_id: string }>(
      (resolve, reject) => {
        socket.on('connected', resolve);
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('timed out waiting for connected event')), 5_000);
      },
    );
    expect(connected.tenant_id).toBe(tenantId);

    const eventPromise = new Promise<{ wallet_code: string; amount: string }>((resolve, reject) => {
      socket.on('transaction.created', resolve);
      setTimeout(() => reject(new Error('timed out waiting for transaction.created')), 8_000);
    });

    await request(app.getHttpServer())
      .post('/internal/v1/ingest')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        notifications: [
          {
            client_ref: 'realtime-1',
            package_name: 'com.bcp.innovacxion.yapeapp',
            title: 'Yape!',
            body: 'Te Yapearon S/ 88.00 de PEDRO SALAZAR. Código de seguridad: 900',
            posted_at: new Date().toISOString(),
          },
        ],
      })
      .expect(202);

    const event = await eventPromise;
    expect(event.wallet_code).toBe('YAPE');
    expect(event.amount).toBe('88.00');

    socket.disconnect();
  }, 15_000);

  it('fans out to concurrent clients without leaking events across tenants', async () => {
    const primaryConnections = await Promise.all(
      Array.from({ length: 20 }, () => connectSocket(baseUrl, ownerToken)),
    );
    const isolatedConnections = await Promise.all(
      Array.from({ length: 10 }, () => connectSocket(baseUrl, secondOwnerToken)),
    );
    const allConnections = [...primaryConnections, ...isolatedConnections];

    try {
      expect(new Set(allConnections.map(({ sessionId }) => sessionId)).size).toBe(30);
      expect(primaryConnections.every(({ tenant }) => tenant === tenantId)).toBe(true);
      expect(isolatedConnections.every(({ tenant }) => tenant === secondTenantId)).toBe(true);

      const expectedTransactionId = transactionIds[1]!;
      const deliveries = primaryConnections.map(
        ({ socket }) =>
          new Promise<{ id: string }>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('timed out waiting for concurrent realtime event')),
              5_000,
            );
            socket.once('transaction.created', (event: { id: string }) => {
              clearTimeout(timeout);
              resolve(event);
            });
          }),
      );
      let leaked = false;
      for (const { socket } of isolatedConnections) {
        socket.once('transaction.created', () => {
          leaked = true;
        });
      }

      eventEmitter.emit(
        TRANSACTION_CREATED_EVENT,
        new TransactionCreatedEvent(
          tenantId,
          expectedTransactionId,
          'YAPE',
          deviceId,
          42,
          'PEN',
          new Date(),
        ),
      );

      const received = await Promise.all(deliveries);
      expect(received).toHaveLength(20);
      expect(received.every(({ id }) => id === expectedTransactionId)).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(leaked).toBe(false);
    } finally {
      for (const { socket } of allConnections) socket.disconnect();
    }
  }, 15_000);

  it('rejects a WebSocket connection without a valid token', async () => {
    const socket: Socket = io(baseUrl, {
      path: '/v1/realtime',
      transports: ['websocket'],
      auth: {},
      forceNew: true,
    });

    const errorEvent = await new Promise<{ code: string }>((resolve, reject) => {
      socket.on('error', resolve);
      setTimeout(() => reject(new Error('timed out waiting for error event')), 5_000);
    });
    expect(errorEvent.code).toBe('UNAUTHENTICATED');
    socket.disconnect();
  }, 10_000);
});

async function connectSocket(
  baseUrl: string,
  token: string,
): Promise<{ sessionId: string; socket: Socket; tenant: string }> {
  const socket: Socket = io(baseUrl, {
    path: '/v1/realtime',
    transports: ['websocket'],
    auth: { token },
    forceNew: true,
    reconnection: false,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('timed out waiting for concurrent socket connection'));
    }, 5_000);
    socket.once('connected', (event: { session_id: string; tenant_id: string }) => {
      clearTimeout(timeout);
      resolve({ sessionId: event.session_id, socket, tenant: event.tenant_id });
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });
  });
}
