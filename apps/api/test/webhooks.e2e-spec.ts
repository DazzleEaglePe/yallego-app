import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { createServer as createHttpsServer, type Server } from 'node:https';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import {
  WEBHOOK_QUEUE,
  type WebhookDeliveryJob,
} from '../src/infrastructure/queue/queue.constants';
import { SsrfHostnameValidator } from '../src/modules/webhooks/adapters/ssrf-hostname-validator';
import { buildWebhookPayload, newEventId } from '../src/modules/webhooks/domain/webhook-payload';
import { computeSignature } from '../src/modules/webhooks/domain/webhook-signature';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

interface ReceivedRequest {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
}

async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 8_000,
): Promise<void> {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

integrationDescribe('Webhooks configuration and delivery', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `dueno-webhooks-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceOfflineEmail: vi.fn().mockResolvedValue(undefined),
    sendDeviceRecoveredEmail: vi.fn().mockResolvedValue(undefined),
    sendWebhookDisabledEmail: vi.fn().mockResolvedValue(undefined),
  };
  let ownerToken: string;
  let tenantId: string;
  let deviceToken: string;

  let receiverServer: Server;
  let receiverUrl: string;
  let received: ReceivedRequest[] = [];
  let respondStatus = 200;
  let certDir: string;
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

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
    process.env.BULLMQ_PREFIX = `test-webhooks-${suffix}`;

    // `registerWebhookSchema` exige `https://` (correcto en producción, ver
    // docs/06_API_CONTRACT.md §9): el receptor de prueba necesita un
    // certificado real, aunque sea autofirmado, para ejercer el mismo
    // código de despacho HTTP que se usa contra un webhook real.
    certDir = mkdtempSync(join(tmpdir(), 'yallego-webhook-cert-'));
    const keyPath = join(certDir, 'key.pem');
    const certPath = join(certDir, 'cert.pem');
    execFileSync('openssl', [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyPath,
      '-out',
      certPath,
      '-days',
      '1',
      '-subj',
      '/CN=127.0.0.1',
    ]);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    receiverServer = createHttpsServer(
      { key: readFileSync(keyPath), cert: readFileSync(certPath) },
      (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          received.push({ headers: req.headers, rawBody: Buffer.concat(chunks).toString('utf8') });
          res.writeHead(respondStatus);
          res.end();
        });
      },
    );
    await new Promise<void>((resolve) => receiverServer.listen(0, '127.0.0.1', () => resolve()));
    const receiverAddress = receiverServer.address() as AddressInfo;
    // Apunta al receptor local de la prueba: se puede porque el validador de
    // SSRF real está sobrescrito abajo. Ese validador (que SÍ rechaza
    // localhost/IPs privadas) se prueba aparte en
    // `ssrf-hostname-validator.spec.ts` y `ssrf-guard.spec.ts`.
    receiverUrl = `https://127.0.0.1:${receiverAddress.port}/hook`;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .overrideProvider(SsrfHostnameValidator)
      .useValue({ assertPublicHostname: vi.fn().mockResolvedValue(undefined) })
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
        business_name: `Bodega Webhooks ${suffix}`,
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
      .send({ code: pairingCode.body.code, device: { manufacturer: 'Xiaomi' } })
      .expect(201);
    deviceToken = paired.body.device_token as string;
  }, 30_000);

  afterAll(async () => {
    await prisma.withoutTenantScope(async (tx) => {
      await tx.tenant.delete({ where: { id: tenantId } });
      await tx.user.deleteMany({ where: { email: ownerEmail } });
    });
    await app.close();
    await new Promise<void>((resolve) => receiverServer.close(() => resolve()));
    if (originalRejectUnauthorized === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
    rmSync(certDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    received = [];
    respondStatus = 200;
  });

  it('enforces the plan webhook limit before creating an endpoint beyond it', async () => {
    // El plan FREE (seed inicial) tiene webhooks: 0.
    const within = await request(app.getHttpServer())
      .post('/v1/webhooks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ url: 'https://ejemplo.pe/hook-limite', subscribed_events: ['transaction.created'] })
      .expect(422);
    expect(within.body.error.code).toBe('PLAN_LIMIT_EXCEEDED');

    await prisma.withoutTenantScope(async (tx) => {
      const comercioPlan = await tx.plan.findUniqueOrThrow({ where: { code: 'COMERCIO' } });
      await tx.subscription.updateMany({ where: { tenantId }, data: { planId: comercioPlan.id } });
    });
  });

  it('registers a webhook endpoint, shows it without the secret in the summary, updates and deletes it', async () => {
    const created = await request(app.getHttpServer())
      .post('/v1/webhooks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        url: 'https://ejemplo.pe/hook-temporal',
        subscribed_events: ['transaction.created'],
        description: 'temporal',
      })
      .expect(201);
    expect(created.body.secret).toMatch(/^whsec_[0-9a-f]{32}$/);
    const endpointId = created.body.id as string;

    const list = await request(app.getHttpServer())
      .get('/v1/webhooks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const summary = list.body.find((item: { id: string }) => item.id === endpointId);
    expect(summary).toBeTruthy();
    expect(summary.secret).toBeUndefined();

    const updated = await request(app.getHttpServer())
      .patch(`/v1/webhooks/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ is_enabled: false })
      .expect(200);
    expect(updated.body.is_enabled).toBe(false);

    await request(app.getHttpServer())
      .delete(`/v1/webhooks/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/v1/webhooks/${endpointId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  it('rejects registering a webhook with a non-HTTPS URL', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/webhooks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ url: 'http://ejemplo.pe/hook', subscribed_events: ['transaction.created'] })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  describe('delivery pipeline', () => {
    let endpointId: string;
    let secret: string;
    let transactionId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/v1/webhooks')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          url: receiverUrl,
          subscribed_events: ['transaction.created', 'transaction.confirmed'],
        })
        .expect(201);
      endpointId = created.body.id as string;
      secret = created.body.secret as string;
    });

    it('delivers transaction.created with a correctly signed body when a notification is ingested', async () => {
      await request(app.getHttpServer())
        .post('/internal/v1/ingest')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          notifications: [
            {
              client_ref: `webhook-created-${suffix}`,
              package_name: 'com.bcp.innovacxion.yapeapp',
              title: 'Yape!',
              body: 'Te Yapearon S/ 47.00 de LUIS FLORES. Código de seguridad: 512',
              posted_at: new Date().toISOString(),
            },
          ],
        })
        .expect(202);

      await waitUntil(() => received.length >= 1);
      const delivery = received[0]!;
      expect(delivery.headers['x-yallego-event-type']).toBe('transaction.created');

      const timestamp = Number(delivery.headers['x-yallego-timestamp']);
      const expectedSignature = `sha256=${computeSignature(secret, timestamp, delivery.rawBody)}`;
      expect(delivery.headers['x-yallego-signature']).toBe(expectedSignature);

      const body = JSON.parse(delivery.rawBody) as {
        data: { transaction: { id: string; amount: string; sender_name: string } };
      };
      expect(body.data.transaction.amount).toBe('47.00');
      expect(body.data.transaction.sender_name).toBe('LUIS FLORES.'); // el parser de Yape captura el punto final del texto de la notificación
      transactionId = body.data.transaction.id;
    }, 15_000);

    it('delivers transaction.confirmed when the transaction is confirmed from the panel', async () => {
      received = [];
      await request(app.getHttpServer())
        .post(`/v1/transactions/${transactionId}/confirm`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(200);

      await waitUntil(() => received.length >= 1);
      expect(received[0]!.headers['x-yallego-event-type']).toBe('transaction.confirmed');
    }, 15_000);

    it('sends a test event on demand and records it in the delivery history', async () => {
      received = [];
      const test = await request(app.getHttpServer())
        .post(`/v1/webhooks/${endpointId}/test`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(test.body.delivery_id).toBeTruthy();

      await waitUntil(() => received.length >= 1);

      await waitUntil(async () => {
        const deliveries = await request(app.getHttpServer())
          .get(`/v1/webhooks/${endpointId}/deliveries`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        return deliveries.body.data.some(
          (d: { id: string; status: string }) =>
            d.id === test.body.delivery_id && d.status === 'DELIVERED',
        );
      });
    }, 15_000);

    it('retries a failed delivery on demand', async () => {
      respondStatus = 500;
      received = [];
      const test = await request(app.getHttpServer())
        .post(`/v1/webhooks/${endpointId}/test`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const deliveryId = test.body.delivery_id as string;

      // Primer intento falla y agenda el siguiente en 1s (retry-policy); en
      // vez de esperar el calendario completo, se fuerza un reintento manual
      // inmediato una vez que el primer intento ya se registró.
      await waitUntil(() => received.length >= 1);
      respondStatus = 200;
      received = [];

      await request(app.getHttpServer())
        .post(`/v1/webhooks/${endpointId}/deliveries/${deliveryId}/retry`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await waitUntil(() => received.length >= 1);

      await waitUntil(async () => {
        const detail = await prisma.withTenant(tenantId, (tx) =>
          tx.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } }),
        );
        return detail.status === 'DELIVERED';
      });

      const retryEvent = await prisma.withTenant(tenantId, (tx) =>
        tx.auditEvent.findFirst({
          where: { tenantId, action: 'webhooks.delivery_retried', resourceId: deliveryId },
        }),
      );
      expect(retryEvent).not.toBeNull();
      expect(retryEvent?.actorType).toBe('USER');
    }, 15_000);

    it('abandons a delivery once retries are exhausted and disables the endpoint after repeated failures', async () => {
      respondStatus = 500;

      await prisma.withTenant(tenantId, (tx) =>
        tx.webhookEndpoint.update({ where: { id: endpointId }, data: { consecutiveFailures: 4 } }),
      );

      const payload = buildWebhookPayload(newEventId(), 'transaction.created', {
        transaction: { id: 'synthetic' },
      });
      const delivery = await prisma.withTenant(tenantId, (tx) =>
        tx.webhookDelivery.create({
          data: {
            tenantId,
            endpointId,
            eventId: payload.id,
            eventType: payload.type,
            payload: payload as unknown as object,
            status: 'PENDING',
            attempts: 7,
            maxAttempts: 8,
            nextAttemptAt: new Date(),
          },
        }),
      );

      const queue = app.get<Queue<WebhookDeliveryJob>>(getQueueToken(WEBHOOK_QUEUE));
      await queue.add(
        'deliver',
        { deliveryId: delivery.id, tenantId },
        { jobId: `${delivery.id}-8` },
      );

      // Se espera a que el endpoint quede deshabilitado, no solo a que la
      // entrega quede ABANDONADA: son dos escrituras separadas y la segunda
      // (incremento de `consecutiveFailures` + deshabilitar) ocurre después,
      // no atómicamente con la primera.
      await waitUntil(async () => {
        const endpoint = await prisma.withTenant(tenantId, (tx) =>
          tx.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } }),
        );
        return !endpoint.isEnabled;
      }, 10_000);

      const endpoint = await prisma.withTenant(tenantId, (tx) =>
        tx.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } }),
      );
      expect(endpoint.consecutiveFailures).toBe(5);
      expect(endpoint.isEnabled).toBe(false);
      expect(mailer.sendWebhookDisabledEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: ownerEmail, endpointUrl: receiverUrl }),
      );

      respondStatus = 200;
    }, 15_000);
  });

  describe('API key access', () => {
    it('lets an API key with the webhooks:write scope register a webhook, attributed to the key in the audit log', async () => {
      const apiKey = await request(app.getHttpServer())
        .post('/v1/api-keys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          label: 'Integración con scope de webhooks',
          scopes: ['webhooks:read', 'webhooks:write'],
        })
        .expect(201);

      const created = await request(app.getHttpServer())
        .post('/v1/webhooks')
        .set('Authorization', `Bearer ${apiKey.body.key}`)
        .send({
          url: 'https://ejemplo.pe/hook-api-key',
          subscribed_events: ['transaction.created'],
        })
        .expect(201);

      const audit = await prisma.withTenant(tenantId, (tx) =>
        tx.auditEvent.findFirst({
          where: { resourceType: 'webhook_endpoint', resourceId: created.body.id },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(audit?.actorType).toBe('API_KEY');
      expect(audit?.actorApiKeyId).toBeTruthy();
      expect(audit?.actorUserId).toBeNull();
    });

    it('rejects an API key without the webhooks:write scope', async () => {
      const apiKey = await request(app.getHttpServer())
        .post('/v1/api-keys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ label: 'Integración solo lectura de transacciones', scopes: ['transactions:read'] })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks')
        .set('Authorization', `Bearer ${apiKey.body.key}`)
        .send({
          url: 'https://ejemplo.pe/hook-sin-scope',
          subscribed_events: ['transaction.created'],
        })
        .expect(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
