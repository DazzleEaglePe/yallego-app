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

async function waitForRawNotificationStatus(
  prisma: PrismaService,
  rawNotificationId: string,
  status: string,
  timeoutMs = 8_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const notification = await prisma.withoutTenantScope((tx) =>
      tx.rawNotification.findUnique({ where: { id: rawNotificationId } }),
    );
    if (notification?.parseStatus === status) return notification;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`timed out waiting for raw notification ${rawNotificationId} to reach ${status}`);
}

integrationDescribe(
  'Platform administration: parsers, unmatched notifications and wallet catalog',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const suffix = randomUUID().slice(0, 8);
    const adminEmail = `admin-parsers-${suffix}@yallego.internal`;
    const adminPassword = 'clave-super-segura-de-administrador-1';
    let totpSecret: Buffer;
    let adminId: string;
    let platformToken: string;
    let yapeWalletId: string;

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

    // Datos del tenant/dispositivo usados para disparar ingesta real.
    let ownerToken: string;
    let tenantId: string;
    let ownerEmail: string;
    let deviceToken: string;

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
      process.env.BULLMQ_PREFIX = `test-platform-admin-${suffix}`;
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
          fullName: 'Administradora de Parsers',
          passwordHash: await passwordService.hash(adminPassword),
          totpSecret: Buffer.from(cipher.encrypt(secret.toString('base64'))),
        },
      });
      adminId = admin.id;

      const login = await request(app.getHttpServer())
        .post('/platform/v1/auth/login')
        .send({ email: adminEmail, password: adminPassword, totp_code: computeTotp(totpSecret) })
        .expect(200);
      platformToken = login.body.access_token as string;

      const yape = await prisma.wallet.findUniqueOrThrow({ where: { code: 'YAPE' } });
      yapeWalletId = yape.id;

      ownerEmail = `dueno-parsers-${suffix}@negocio.pe`;
      const password = 'clave-super-segura-1';
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: ownerEmail,
          password,
          full_name: 'Dueña de Prueba',
          business_name: `Bodega Parsers ${suffix}`,
        });
      const verificationToken = (
        mailer.sendVerificationEmail.mock.calls.at(-1)?.[0] as { token: string }
      ).token;
      await request(app.getHttpServer())
        .post('/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);
      const ownerLogin = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: ownerEmail, password })
        .expect(200);
      ownerToken = ownerLogin.body.access_token as string;
      tenantId = ownerLogin.body.tenants[0].id as string;

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
      await prisma.platformAdmin.delete({ where: { id: adminId } });
      await prisma.withoutTenantScope(async (tx) => {
        await tx.tenant.delete({ where: { id: tenantId } });
        await tx.user.deleteMany({ where: { email: ownerEmail } });
      });
      await app.close();
    });

    it('requires platform authentication on every route in this module', async () => {
      await request(app.getHttpServer())
        .get(`/platform/v1/parsers/${yapeWalletId}/versions`)
        .expect(401);
      await request(app.getHttpServer()).get('/platform/v1/notifications/unmatched').expect(401);
      await request(app.getHttpServer()).get('/platform/v1/wallets').expect(401);
    });

    it('registers a new wallet in the catalog and rejects a duplicate code', async () => {
      const code = `TEST_WALLET_${suffix}`.toUpperCase();
      const created = await request(app.getHttpServer())
        .post('/platform/v1/wallets')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({
          code,
          display_name: 'Billetera de Prueba',
          provider: 'TEST',
          android_package: 'pe.test.wallet',
        })
        .expect(201);
      expect(created.body.code).toBe(code);

      const duplicate = await request(app.getHttpServer())
        .post('/platform/v1/wallets')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ code, display_name: 'Otra', provider: 'TEST', android_package: 'pe.test.wallet2' })
        .expect(409);
      expect(duplicate.body.error.code).toBe('DUPLICATE_RESOURCE');

      const list = await request(app.getHttpServer())
        .get('/platform/v1/wallets')
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);
      expect(list.body.some((wallet: { code: string }) => wallet.code === code)).toBe(true);
    });

    describe('parser versions on a real wallet (YAPE)', () => {
      let newVersionId: string;

      it('lists the seeded active version', async () => {
        const versions = await request(app.getHttpServer())
          .get(`/platform/v1/parsers/${yapeWalletId}/versions`)
          .set('Authorization', `Bearer ${platformToken}`)
          .expect(200);
        expect(versions.body.length).toBeGreaterThanOrEqual(1);
        expect(versions.body.filter((v: { is_active: boolean }) => v.is_active)).toHaveLength(1);
      });

      it('creates a draft version and tests it against a real unmatched notification and a manual sample, before activating anything', async () => {
        const device = await prisma.withTenant(tenantId, (tx) =>
          tx.device.findFirstOrThrow({ where: { tenantId } }),
        );
        const rawNotification = await prisma.withTenant(tenantId, (tx) =>
          tx.rawNotification.create({
            data: {
              tenantId,
              deviceId: device.id,
              packageName: 'com.bcp.innovacxion.yapeapp',
              dedupeHash: randomUUID(),
              postedAt: new Date(),
              title: 'Yape!',
              body: 'Yapeaste S/ 42.00 de PEDRO NUEVO FORMATO. Código de seguridad: 321',
              parseStatus: 'UNMATCHED',
              parseError: 'La notificación no coincide con ningún patrón activo.',
            },
          }),
        );

        const created = await request(app.getHttpServer())
          .post(`/platform/v1/parsers/${yapeWalletId}/versions`)
          .set('Authorization', `Bearer ${platformToken}`)
          .send({
            rules: [
              {
                pattern:
                  '^(Te Yapearon|Yapeaste) S/\\s*(?<amount>[\\d,]+\\.\\d{2}) de (?<sender>.+?)(?:\\s*Código de seguridad:\\s*(?<securityCode>\\d+))?\\.?\\s*$',
                flags: 'i',
              },
            ],
            notes: 'Acepta también la variante "Yapeaste" reportada por un usuario',
          })
          .expect(201);
        newVersionId = created.body.id;
        expect(created.body.is_active).toBe(false);
        expect(created.body.version).toBeGreaterThan(1);

        const testResult = await request(app.getHttpServer())
          .post(`/platform/v1/parsers/versions/${newVersionId}/test`)
          .set('Authorization', `Bearer ${platformToken}`)
          .send({
            raw_notification_ids: [rawNotification.id],
            custom_samples: [
              {
                title: 'Yape!',
                text: 'Te Yapearon S/ 10.00 de ALGUIEN MAS. Código de seguridad: 999',
              },
              { title: 'Yape!', text: 'esto no es una notificación de yape' },
            ],
          })
          .expect(200);

        expect(testResult.body).toHaveLength(3);
        const byRawNotification = testResult.body.find(
          (r: { source: string }) => r.source === 'raw_notification',
        );
        expect(byRawNotification.matched).toBe(true);
        expect(byRawNotification.amount).toBe('42.00');
        expect(byRawNotification.sender_name).toBe('PEDRO NUEVO FORMATO.');

        const customResults = testResult.body.filter(
          (r: { source: string }) => r.source === 'custom_sample',
        );
        expect(customResults[0].matched).toBe(true);
        expect(customResults[1].matched).toBe(false);

        // Todavía no se activó: la notificación real sigue UNMATCHED.
        const stillUnmatched = await prisma.withoutTenantScope((tx) =>
          tx.rawNotification.findUnique({ where: { id: rawNotification.id } }),
        );
        expect(stillUnmatched?.parseStatus).toBe('UNMATCHED');
      });

      it('activates the new version, deactivating the previous one, invalidates the cache immediately, and logs both actions in the audit trail', async () => {
        const activated = await request(app.getHttpServer())
          .post(`/platform/v1/parsers/versions/${newVersionId}/activate`)
          .set('Authorization', `Bearer ${platformToken}`)
          .expect(200);
        expect(activated.body.is_active).toBe(true);

        const versions = await request(app.getHttpServer())
          .get(`/platform/v1/parsers/${yapeWalletId}/versions`)
          .set('Authorization', `Bearer ${platformToken}`)
          .expect(200);
        const activeOnes = versions.body.filter((v: { is_active: boolean }) => v.is_active);
        expect(activeOnes).toHaveLength(1);
        expect(activeOnes[0].id).toBe(newVersionId);

        // Sin redespliegue (RF-WAL-006): una ingesta real, inmediatamente
        // después de activar, ya debe usar la versión nueva — no la de hace
        // 60s que serviría el caché sin la invalidación explícita.
        const ingest = await request(app.getHttpServer())
          .post('/internal/v1/ingest')
          .set('Authorization', `Bearer ${deviceToken}`)
          .send({
            notifications: [
              {
                client_ref: `nuevo-formato-${suffix}`,
                package_name: 'com.bcp.innovacxion.yapeapp',
                title: 'Yape!',
                body: 'Yapeaste S/ 77.00 de OTRA PERSONA. Código de seguridad: 654',
                posted_at: new Date().toISOString(),
              },
            ],
          })
          .expect(202);

        const notificationId = ingest.body.accepted[0].notification_id as string;
        const parsed = await waitForRawNotificationStatus(prisma, notificationId, 'PARSED');
        expect(parsed.parserPatternId).toBe(newVersionId);

        const events = await prisma.withoutTenantScope((tx) =>
          tx.auditEvent.findMany({
            where: { actorPlatformAdminId: adminId, resourceId: newVersionId },
            orderBy: { createdAt: 'asc' },
          }),
        );
        expect(events.map((event) => event.action)).toEqual([
          'platform.parser_version_created',
          'platform.parser_version_activated',
        ]);
      }, 15_000);
    });

    describe('unmatched notifications and reprocessing', () => {
      let unmatchedId: string;

      it('lists notifications no parser could match', async () => {
        const ingest = await request(app.getHttpServer())
          .post('/internal/v1/ingest')
          .set('Authorization', `Bearer ${deviceToken}`)
          .send({
            notifications: [
              {
                client_ref: `basura-${suffix}`,
                package_name: 'com.bcp.innovacxion.yapeapp',
                title: 'Yape!',
                body: 'este texto no tiene el formato de ninguna notificación conocida',
                posted_at: new Date().toISOString(),
              },
            ],
          })
          .expect(202);
        unmatchedId = ingest.body.accepted[0].notification_id as string;
        await waitForRawNotificationStatus(prisma, unmatchedId, 'UNMATCHED');

        const list = await request(app.getHttpServer())
          .get(`/platform/v1/notifications/unmatched?wallet_code=YAPE`)
          .set('Authorization', `Bearer ${platformToken}`)
          .expect(200);
        expect(list.body.some((n: { id: string }) => n.id === unmatchedId)).toBe(true);
      }, 15_000);

      it('reprocesses a notification and logs the action, leaving it unmatched again since no pattern covers this text', async () => {
        const reprocessed = await request(app.getHttpServer())
          .post('/platform/v1/notifications/reprocess')
          .set('Authorization', `Bearer ${platformToken}`)
          .send({ raw_notification_ids: [unmatchedId] })
          .expect(200);
        expect(reprocessed.body.requeued).toBe(1);

        await waitForRawNotificationStatus(prisma, unmatchedId, 'UNMATCHED');

        const events = await prisma.withoutTenantScope((tx) =>
          tx.auditEvent.findMany({
            where: { actorPlatformAdminId: adminId, action: 'platform.notifications_reprocessed' },
          }),
        );
        expect(
          events.some((event) =>
            (
              event.metadata as { raw_notification_ids?: string[] } | null
            )?.raw_notification_ids?.includes(unmatchedId),
          ),
        ).toBe(true);
      }, 15_000);
    });

    describe('billing: manual payments and subscription changes', () => {
      it('registers a manual payment for a tenant, logged in the audit trail', async () => {
        const payment = await request(app.getHttpServer())
          .post('/platform/v1/payments')
          .set('Authorization', `Bearer ${platformToken}`)
          .send({
            tenant_id: tenantId,
            amount: 29,
            reference: `TRANSFER-${suffix}`,
            covers_from: '2026-08-01',
            covers_to: '2026-08-31',
          })
          .expect(201);
        expect(payment.body.tenant_id).toBe(tenantId);
        expect(payment.body.amount).toBe('29.00');
        expect(payment.body.reference).toBe(`TRANSFER-${suffix}`);

        const events = await prisma.withoutTenantScope((tx) =>
          tx.auditEvent.findMany({
            where: {
              actorPlatformAdminId: adminId,
              action: 'platform.payment_registered',
              resourceId: payment.body.id,
            },
          }),
        );
        expect(events).toHaveLength(1);
      });

      it('applies an immediate upgrade over HTTP, reflected right away in the tenant panel', async () => {
        const response = await request(app.getHttpServer())
          .post(`/platform/v1/tenants/${tenantId}/subscription`)
          .set('Authorization', `Bearer ${platformToken}`)
          .send({ plan_code: 'COMERCIO', billing_cycle: 'MONTHLY', reason: 'prueba automatizada' })
          .expect(200);
        expect(response.body).toMatchObject({
          tenant_id: tenantId,
          from_plan: 'FREE',
          to_plan: 'COMERCIO',
          immediate: true,
        });

        const subscription = await request(app.getHttpServer())
          .get('/v1/subscription')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        expect(subscription.body.plan.code).toBe('COMERCIO');

        expect(mailer.sendPlanChangeEmail).toHaveBeenCalledWith(
          expect.objectContaining({ toPlan: 'Comercio', immediate: true }),
        );
      });

      it('defers a downgrade until period rollover, and grants a courtesy plan without a payment', async () => {
        const downgrade = await request(app.getHttpServer())
          .post(`/platform/v1/tenants/${tenantId}/subscription`)
          .set('Authorization', `Bearer ${platformToken}`)
          .send({ plan_code: 'NEGOCIO', billing_cycle: 'MONTHLY' })
          .expect(200);
        expect(downgrade.body.immediate).toBe(false);

        const afterDowngradeRequest = await request(app.getHttpServer())
          .get('/v1/subscription')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        expect(afterDowngradeRequest.body.plan.code).toBe('COMERCIO'); // sigue sin cambios, el downgrade está diferido
        expect(afterDowngradeRequest.body.pending_plan.code).toBe('NEGOCIO');

        const courtesy = await request(app.getHttpServer())
          .post(`/platform/v1/tenants/${tenantId}/courtesy-plan`)
          .set('Authorization', `Bearer ${platformToken}`)
          .send({
            plan_code: 'CADENA',
            billing_cycle: 'MONTHLY',
            reason: 'compensación por incidente',
          })
          .expect(200);
        expect(courtesy.body).toMatchObject({ to_plan: 'CADENA', immediate: true });

        const afterCourtesy = await request(app.getHttpServer())
          .get('/v1/subscription')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        expect(afterCourtesy.body.plan.code).toBe('CADENA');

        const history = await request(app.getHttpServer())
          .get('/v1/subscription/history')
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200);
        const courtesyEntry = history.body.find(
          (entry: { to_plan: string }) => entry.to_plan === 'CADENA',
        );
        expect(courtesyEntry.reason).toContain('Cortesía');
      });
    });

    describe('global platform metrics', () => {
      it('reports tenant, transaction, parsing and webhook health metrics', async () => {
        const response = await request(app.getHttpServer())
          .get('/platform/v1/metrics')
          .set('Authorization', `Bearer ${platformToken}`)
          .expect(200);

        expect(response.body.tenants.total).toBeGreaterThanOrEqual(1);
        expect(response.body.tenants.active + response.body.tenants.suspended).toBeLessThanOrEqual(
          response.body.tenants.total,
        );
        expect(typeof response.body.transactions.last_30_days).toBe('number');
        expect(Number(response.body.transactions.amount_last_30_days)).toBeGreaterThanOrEqual(0);
        expect(response.body.parsing.parsed_last_30_days).toBeGreaterThanOrEqual(1); // al menos las de este archivo
        expect(response.body.parsing.unmatched_last_30_days).toBeGreaterThanOrEqual(1);
        if (response.body.parsing.success_rate_last_30_days !== null) {
          expect(response.body.parsing.success_rate_last_30_days).toBeGreaterThanOrEqual(0);
          expect(response.body.parsing.success_rate_last_30_days).toBeLessThanOrEqual(100);
        }
        expect(response.body.webhooks.active_endpoints).toBeGreaterThanOrEqual(0);
      });
    });
  },
);
