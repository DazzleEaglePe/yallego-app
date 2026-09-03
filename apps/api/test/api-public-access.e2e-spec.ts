import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

const mailer = {
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  sendDeviceOfflineEmail: vi.fn().mockResolvedValue(undefined),
  sendDeviceRecoveredEmail: vi.fn().mockResolvedValue(undefined),
  sendWebhookDisabledEmail: vi.fn().mockResolvedValue(undefined),
};

async function registerOwner(app: INestApplication, suffix: string, businessName: string) {
  const email = `dueno-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  mailer.sendVerificationEmail.mockClear();

  await request(app.getHttpServer()).post('/v1/auth/register').send({
    email,
    password,
    full_name: 'Dueña de Prueba',
    business_name: businessName,
  });
  const verificationToken = mailer.sendVerificationEmail.mock.calls[0]?.[0].token as string;
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

// Crea un plan ad-hoc con código único por prueba en vez de mutar los planes
// sembrados (`FREE`/`NEGOCIO`/...): esos son filas compartidas y otros
// archivos de prueba e2e corren en paralelo contra la misma base.
async function assignCustomPlan(
  prisma: PrismaService,
  tenantId: string,
  suffix: string,
  limits: Record<string, number | boolean | string>,
) {
  await prisma.withoutTenantScope(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        code: `TEST_${suffix}`,
        displayName: `Plan de prueba ${suffix}`,
        sortOrder: 99,
        isPublic: false,
        limits,
      },
    });
    await tx.subscription.updateMany({ where: { tenantId }, data: { planId: plan.id } });
  });
}

integrationDescribe(
  'Public API access: rate limiting, device scope and realtime plan gating',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let baseUrl: string;
    const suffix = randomUUID().slice(0, 8);

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
      process.env.BULLMQ_PREFIX = `test-public-access-${suffix}`;

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
    }, 30_000);

    afterAll(async () => {
      await app.close();
    });

    describe('rate limiting and devices:read scope', () => {
      let tenantId: string;
      let ownerToken: string;
      let ownerEmail: string;

      beforeAll(async () => {
        const owner = await registerOwner(app, `rl-${suffix}`, `Bodega Rate Limit ${suffix}`);
        tenantId = owner.tenantId;
        ownerToken = owner.token;
        ownerEmail = owner.email;

        await assignCustomPlan(prisma, tenantId, `rl-${suffix}`, {
          wallets: 3,
          devices: 3,
          transactions_per_month: 1_000,
          users: 3,
          webhooks: 5, // límite de webhooks reutilizado como límite de claves de API (ApiKeysService) — esta prueba crea varias
          websocket_api: false,
          retention_days: 90,
          rate_limit_per_minute: 3,
          support: 'email',
        });

        const pairingCode = await request(app.getHttpServer())
          .post('/v1/devices/pairing-codes')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ label: 'Celular de prueba' })
          .expect(201);
        await request(app.getHttpServer())
          .post('/internal/v1/devices/pair')
          .send({ code: pairingCode.body.code, device: { manufacturer: 'Xiaomi' } })
          .expect(201);
      });

      afterAll(async () => {
        await prisma.withoutTenantScope(async (tx) => {
          await tx.tenant.delete({ where: { id: tenantId } });
          await tx.user.deleteMany({ where: { email: ownerEmail } });
          await tx.plan.deleteMany({ where: { code: `TEST_rl-${suffix}` } });
        });
      });

      it('exposes device status to an API key with the devices:read scope, and rejects one without it', async () => {
        const apiKey = await request(app.getHttpServer())
          .post('/v1/api-keys')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ label: 'Integración de estado de dispositivos', scopes: ['devices:read'] })
          .expect(201);

        const list = await request(app.getHttpServer())
          .get('/v1/devices')
          .set('Authorization', `Bearer ${apiKey.body.key}`)
          .expect(200);
        expect(Array.isArray(list.body)).toBe(true);
        expect(list.body.length).toBeGreaterThanOrEqual(1);

        const withoutScope = await request(app.getHttpServer())
          .post('/v1/api-keys')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ label: 'Integración sin scope de dispositivos', scopes: ['transactions:read'] })
          .expect(201);
        const rejected = await request(app.getHttpServer())
          .get('/v1/devices')
          .set('Authorization', `Bearer ${withoutScope.body.key}`)
          .expect(403);
        expect(rejected.body.error.code).toBe('FORBIDDEN');
      });

      it('applies the plan rate limit per API key, with informative headers, and recovers after the window', async () => {
        const apiKey = await request(app.getHttpServer())
          .post('/v1/api-keys')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ label: 'Integración con límite de tasa bajo', scopes: ['devices:read'] })
          .expect(201);
        const key = apiKey.body.key as string;

        const remaining: string[] = [];
        for (let i = 0; i < 3; i += 1) {
          const response = await request(app.getHttpServer())
            .get('/v1/devices')
            .set('Authorization', `Bearer ${key}`)
            .expect(200);
          expect(response.headers['x-ratelimit-limit']).toBe('3');
          remaining.push(response.headers['x-ratelimit-remaining'] as string);
        }
        expect(remaining).toEqual(['2', '1', '0']);

        const limited = await request(app.getHttpServer())
          .get('/v1/devices')
          .set('Authorization', `Bearer ${key}`)
          .expect(429);
        expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
        expect(limited.body.error.details.limit).toBe(3);
      });
    });

    describe('realtime access for API keys, gated by plan and scope', () => {
      let comercioTenantId: string;
      let comercioOwnerEmail: string;
      let subscribedKey: string;
      let unscoped: { key: string };

      let freeTenantId: string;
      let freeOwnerEmail: string;
      let freeOwnerToken: string;
      let freePlanKey: string;

      beforeAll(async () => {
        const comercio = await registerOwner(
          app,
          `rt-comercio-${suffix}`,
          `Comercio Tiempo Real ${suffix}`,
        );
        comercioTenantId = comercio.tenantId;
        comercioOwnerEmail = comercio.email;
        await assignCustomPlan(prisma, comercioTenantId, `rt-comercio-${suffix}`, {
          wallets: 3,
          devices: 3,
          transactions_per_month: 1_000,
          users: 3,
          webhooks: 5,
          websocket_api: true,
          retention_days: 90,
          rate_limit_per_minute: 300,
          support: 'priority',
        });
        const withScope = await request(app.getHttpServer())
          .post('/v1/api-keys')
          .set('Authorization', `Bearer ${comercio.token}`)
          .send({ label: 'Integración en tiempo real', scopes: ['realtime:subscribe'] })
          .expect(201);
        subscribedKey = withScope.body.key as string;
        const withoutScope = await request(app.getHttpServer())
          .post('/v1/api-keys')
          .set('Authorization', `Bearer ${comercio.token}`)
          .send({ label: 'Integración sin scope de tiempo real', scopes: ['transactions:read'] })
          .expect(201);
        unscoped = { key: withoutScope.body.key as string };

        const free = await registerOwner(app, `rt-free-${suffix}`, `Free Tiempo Real ${suffix}`);
        freeTenantId = free.tenantId;
        freeOwnerEmail = free.email;
        freeOwnerToken = free.token;
        await assignCustomPlan(prisma, freeTenantId, `rt-free-${suffix}`, {
          wallets: 1,
          devices: 1,
          transactions_per_month: 200,
          users: 1,
          webhooks: 1,
          websocket_api: false,
          retention_days: 30,
          rate_limit_per_minute: 0,
          support: 'community',
        });
        const freeKey = await request(app.getHttpServer())
          .post('/v1/api-keys')
          .set('Authorization', `Bearer ${freeOwnerToken}`)
          .send({ label: 'Integración de plan sin acceso', scopes: ['realtime:subscribe'] })
          .expect(201);
        freePlanKey = freeKey.body.key as string;
      }, 20_000);

      afterAll(async () => {
        await prisma.withoutTenantScope(async (tx) => {
          for (const tenantId of [comercioTenantId, freeTenantId].filter(Boolean)) {
            await tx.tenant.delete({ where: { id: tenantId } });
          }
          await tx.user.deleteMany({
            where: { email: { in: [comercioOwnerEmail, freeOwnerEmail] } },
          });
          await tx.plan.deleteMany({
            where: { code: { in: [`TEST_rt-comercio-${suffix}`, `TEST_rt-free-${suffix}`] } },
          });
        });
      });

      async function connectAndWait(token: string, expectEvent: 'connected' | 'error') {
        const socket: Socket = io(baseUrl, {
          path: '/v1/realtime',
          transports: ['websocket'],
          auth: { token },
          forceNew: true,
        });
        try {
          const payload = await new Promise<Record<string, unknown>>((resolve, reject) => {
            socket.on(expectEvent, resolve);
            socket.on(
              expectEvent === 'connected' ? 'error' : 'connected',
              (data: Record<string, unknown>) =>
                reject(
                  new Error(
                    `unexpected ${expectEvent === 'connected' ? 'error' : 'connected'} event: ${JSON.stringify(data)}`,
                  ),
                ),
            );
            socket.on('connect_error', reject);
            setTimeout(() => reject(new Error(`timed out waiting for ${expectEvent}`)), 5_000);
          });
          return payload;
        } finally {
          socket.disconnect();
        }
      }

      it('allows an API key with realtime:subscribe on a plan with websocket_api enabled', async () => {
        const payload = await connectAndWait(subscribedKey, 'connected');
        expect(payload.tenant_id).toBe(comercioTenantId);
      }, 10_000);

      it('rejects an API key without the realtime:subscribe scope', async () => {
        const payload = await connectAndWait(unscoped.key, 'error');
        expect(payload.code).toBe('FORBIDDEN');
      }, 10_000);

      it('rejects an API key whose plan does not include websocket_api, even with the right scope', async () => {
        const payload = await connectAndWait(freePlanKey, 'error');
        expect(payload.code).toBe('FORBIDDEN');
      }, 10_000);

      it('still allows the panel (JWT) to connect regardless of the plan', async () => {
        const payload = await connectAndWait(freeOwnerToken, 'connected');
        expect(payload.tenant_id).toBe(freeTenantId);
      }, 10_000);
    });
  },
);
