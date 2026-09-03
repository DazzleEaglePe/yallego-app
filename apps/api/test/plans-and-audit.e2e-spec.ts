import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import { PlanChangeApplicationService } from '../src/modules/plans/plan-change-application.service';
import { RetentionScheduler } from '../src/modules/plans/retention.scheduler';
import { SubscriptionPeriodScheduler } from '../src/modules/plans/subscription-period.scheduler';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

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

async function assignCustomPlan(
  prisma: PrismaService,
  tenantId: string,
  code: string,
  limits: Record<string, number | boolean | string>,
) {
  return prisma.withoutTenantScope(async (tx) => {
    const plan = await tx.plan.create({
      data: { code, displayName: `Plan de prueba ${code}`, sortOrder: 50, isPublic: false, limits },
    });
    await tx.subscription.updateMany({ where: { tenantId }, data: { planId: plan.id } });
    return plan;
  });
}

integrationDescribe('Plans, usage limits, subscription changes and audit log', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `dueno-plans-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
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
  let ownerToken: string;
  let tenantId: string;
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
    process.env.BULLMQ_PREFIX = `test-plans-${suffix}`;

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
        business_name: `Bodega Planes ${suffix}`,
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
  });

  it('lists the public plan catalog without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/v1/plans').expect(200);
    const codes = response.body.map((plan: { code: string }) => plan.code);
    expect(codes).toEqual(expect.arrayContaining(['FREE', 'NEGOCIO', 'COMERCIO', 'CADENA']));
    const free = response.body.find((plan: { code: string }) => plan.code === 'FREE');
    expect(free.limits.transactions_per_month).toBe(200);
  });

  it('shows the current subscription with plan, limits and usage', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(response.body.plan.code).toBe('FREE');
    expect(response.body.usage).toEqual({
      transactions_count: 0,
      api_calls_count: 0,
      webhook_calls_count: 0,
    });
    expect(response.body.pending_plan).toBeNull();
  });

  it('requests a plan change and returns the payment envelope from docs/06_API_CONTRACT.md §11', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/subscription/change')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ plan_code: 'COMERCIO', billing_cycle: 'ANNUAL' })
      .expect(202);

    expect(response.body).toMatchObject({
      status: 'PENDING_PAYMENT',
      requested_plan: 'COMERCIO',
      billing_cycle: 'ANNUAL',
      currency: 'PEN',
      payment_instructions: { method: 'TRANSFER' },
    });
    expect(response.body.payment_instructions.reference).toMatch(/^YLG-\d{4}-\d{6}$/);

    // No debe haber tocado la suscripción real: el pago todavía no se confirmó.
    const subscription = await request(app.getHttpServer())
      .get('/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(subscription.body.plan.code).toBe('FREE');
  });

  it('rejects a plan change request for a plan that does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/subscription/change')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ plan_code: 'NO_EXISTE', billing_cycle: 'MONTHLY' })
      .expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('applies an upgrade immediately and a downgrade only at period rollover', async () => {
    const applier = app.get(PlanChangeApplicationService);
    const scheduler = app.get(SubscriptionPeriodScheduler);

    await applier.applyConfirmedChange(
      tenantId,
      'COMERCIO',
      'ANNUAL',
      null,
      'pago manual confirmado (prueba)',
      {
        amount: 790,
        reference: 'YLG-2026-000841',
      },
    );

    const afterUpgrade = await request(app.getHttpServer())
      .get('/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(afterUpgrade.body.plan.code).toBe('COMERCIO');
    expect(afterUpgrade.body.pending_plan).toBeNull();

    const payment = await prisma.withoutTenantScope((tx) =>
      tx.manualPayment.findFirst({ where: { tenantId } }),
    );
    expect(payment?.amount.toNumber()).toBe(790);
    expect(payment?.reference).toBe('YLG-2026-000841');

    await applier.applyConfirmedChange(
      tenantId,
      'NEGOCIO',
      'MONTHLY',
      null,
      'downgrade solicitado (prueba)',
    );

    const afterDowngradeRequest = await request(app.getHttpServer())
      .get('/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(afterDowngradeRequest.body.plan.code).toBe('COMERCIO'); // sin cambios todavía
    expect(afterDowngradeRequest.body.pending_plan.code).toBe('NEGOCIO');

    const history = await request(app.getHttpServer())
      .get('/v1/subscription/history')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(history.body.map((item: { to_plan: string }) => item.to_plan)).toEqual([
      'NEGOCIO',
      'COMERCIO',
    ]);

    // Fuerza el cierre de período para que el scheduler recoja el downgrade pendiente.
    const forcedPeriodEnd = new Date(Date.now() - 1_000);
    await prisma.withoutTenantScope((tx) =>
      tx.subscription.updateMany({ where: { tenantId }, data: { periodEnd: forcedPeriodEnd } }),
    );
    await scheduler.rolloverDuePeriods();

    const afterRollover = await request(app.getHttpServer())
      .get('/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(afterRollover.body.plan.code).toBe('NEGOCIO');
    expect(afterRollover.body.pending_plan).toBeNull();
    // El nuevo período arranca exactamente donde terminó el anterior (forzado arriba).
    expect(new Date(afterRollover.body.period_start).getTime()).toBe(forcedPeriodEnd.getTime());
    expect(new Date(afterRollover.body.period_end).getTime()).toBeGreaterThan(
      forcedPeriodEnd.getTime(),
    );

    expect(mailer.sendPlanChangeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toPlan: 'Comercio', immediate: true }),
    );
    expect(mailer.sendPlanChangeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toPlan: 'Negocio', immediate: false }),
    );

    // Historial no duplicado por el rollover: sigue siendo dos entradas, el
    // downgrade ya quedó registrado al confirmarse, no cuando se aplicó.
    const historyAfter = await request(app.getHttpServer())
      .get('/v1/subscription/history')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(historyAfter.body).toHaveLength(2);
  });

  it('increments usage counters, warns at 80%/100% of the transaction limit and then rejects further ingestion', async () => {
    await assignCustomPlan(prisma, tenantId, `TEST_umbral_${suffix}`, {
      wallets: 3,
      devices: 3,
      transactions_per_month: 5,
      users: 3,
      webhooks: 5,
      websocket_api: false,
      retention_days: 3_650,
      rate_limit_per_minute: 60,
      support: 'email',
    });

    for (let i = 1; i <= 5; i += 1) {
      const ingest = await request(app.getHttpServer())
        .post('/internal/v1/ingest')
        .set('Authorization', `Bearer ${deviceToken}`)
        .send({
          notifications: [
            {
              client_ref: `umbral-${suffix}-${i}`,
              package_name: 'com.bcp.innovacxion.yapeapp',
              title: 'Yape!',
              body: `Te Yapearon S/ ${i}.00 de PERSONA NUMERO ${i}. Código de seguridad: ${100 + i}`,
              posted_at: new Date().toISOString(),
            },
          ],
        })
        .expect(202);
      const transaction = await waitForTransaction(prisma, ingest.body.accepted[0].notification_id);
      expect(transaction).not.toBeNull();
    }

    const subscription = await request(app.getHttpServer())
      .get('/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(subscription.body.usage.transactions_count).toBe(5);

    expect(mailer.sendUsageThresholdEmail).toHaveBeenCalledWith(
      expect.objectContaining({ percentage: 80, limit: 5 }),
    );
    expect(mailer.sendUsageThresholdEmail).toHaveBeenCalledWith(
      expect.objectContaining({ percentage: 100, limit: 5 }),
    );
    expect(mailer.sendUsageThresholdEmail).toHaveBeenCalledTimes(2); // no se reenvía tras cruzar el umbral una vez

    const rejected = await request(app.getHttpServer())
      .post('/internal/v1/ingest')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({
        notifications: [
          {
            client_ref: `umbral-${suffix}-6`,
            package_name: 'com.bcp.innovacxion.yapeapp',
            title: 'Yape!',
            body: 'Te Yapearon S/ 6.00 de PERSONA NUMERO 6. Código de seguridad: 106',
            posted_at: new Date().toISOString(),
          },
        ],
      })
      .expect(422);
    expect(rejected.body.error.code).toBe('PLAN_LIMIT_EXCEEDED');
    expect(rejected.body.error.details.limit).toBe(5);
  }, 30_000);

  it('logs, lists with filters and cursor pagination, and exports audit events as CSV', async () => {
    const all = await request(app.getHttpServer())
      .get('/v1/audit')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(all.body.data.length).toBeGreaterThan(0);
    expect(all.body.data[0]).toHaveProperty('action');

    const filtered = await request(app.getHttpServer())
      .get('/v1/audit?action=wallets.activated')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(
      filtered.body.data.every((event: { action: string }) => event.action === 'wallets.activated'),
    ).toBe(true);
    expect(filtered.body.data.length).toBeGreaterThanOrEqual(1);

    const seen = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await request(app.getHttpServer())
        .get(`/v1/audit?limit=1${cursor ? `&cursor=${cursor}` : ''}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      for (const event of page.body.data) seen.add(event.id);
      cursor = page.body.pagination.next_cursor;
      pages += 1;
    } while (cursor && pages < 20);
    expect(seen.size).toBe(Math.min(all.body.data.length, 20));
    expect(seen.size).toBeGreaterThanOrEqual(1);

    const exported = await request(app.getHttpServer())
      .post('/v1/audit/export')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.text.split('\n')[0]).toContain('accion');
  });

  it('cannot be modified or deleted even by the application role (audit_events_immutability migration)', async () => {
    await expect(
      prisma.withoutTenantScope((tx) =>
        tx.$executeRawUnsafe(
          `UPDATE audit_events SET action = 'hacked' WHERE tenant_id = '${tenantId}'`,
        ),
      ),
    ).rejects.toThrow();
    await expect(
      prisma.withoutTenantScope((tx) =>
        tx.$executeRawUnsafe(`DELETE FROM audit_events WHERE tenant_id = '${tenantId}'`),
      ),
    ).rejects.toThrow();
  });

  it('retention scheduler removes expired tokens, archives old raw notifications and prunes data past the plan retention window', async () => {
    const user = await prisma.withoutTenantScope((tx) =>
      tx.user.findUniqueOrThrow({ where: { email: ownerEmail } }),
    );

    const expiredToken = await prisma.withoutTenantScope((tx) =>
      tx.refreshToken.create({
        data: {
          userId: user.id,
          familyId: randomUUID(),
          tokenHash: `expired-${randomUUID()}`,
          expiresAt: new Date(Date.now() - 35 * 24 * 60 * 60_000),
        },
      }),
    );
    const freshToken = await prisma.withoutTenantScope((tx) =>
      tx.refreshToken.create({
        data: {
          userId: user.id,
          familyId: randomUUID(),
          tokenHash: `fresh-${randomUUID()}`,
          expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60_000), // vencido, pero dentro de la gracia de 30 días
        },
      }),
    );

    // Un plan agresivo (retención de 1 día) aísla el efecto del scheduler a
    // los datos de ESTE tenant: los planes reales tienen 30-1095 días, así
    // que nunca alcanzan a datos recientes creados por otros archivos de
    // prueba que corren en paralelo contra la misma base.
    await assignCustomPlan(prisma, tenantId, `TEST_retencion_${suffix}`, {
      wallets: 3,
      devices: 3,
      transactions_per_month: 1_000,
      users: 3,
      webhooks: 5,
      websocket_api: false,
      retention_days: 1,
      rate_limit_per_minute: 60,
      support: 'email',
    });

    const device = await prisma.withTenant(tenantId, (tx) =>
      tx.device.findFirstOrThrow({ where: { tenantId } }),
    );
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { code: 'YAPE' } });
    const oldRaw = await prisma.withTenant(tenantId, (tx) =>
      tx.rawNotification.create({
        data: {
          tenantId,
          deviceId: device.id,
          packageName: 'com.bcp.innovacxion.yapeapp',
          dedupeHash: randomUUID(),
          postedAt: new Date(Date.now() - 100 * 24 * 60 * 60_000),
          receivedAt: new Date(Date.now() - 100 * 24 * 60 * 60_000),
          parseStatus: 'PARSED',
        },
      }),
    );
    const oldTransaction = await prisma.withTenant(tenantId, (tx) =>
      tx.transaction.create({
        data: {
          tenantId,
          deviceId: device.id,
          walletId: wallet.id,
          rawNotificationId: oldRaw.id,
          amount: '10.00',
          occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60_000), // más viejo que la retención de 1 día del plan
        },
      }),
    );

    const scheduler = app.get(RetentionScheduler);
    await scheduler.runRetention();

    const expiredStillThere = await prisma.withoutTenantScope((tx) =>
      tx.refreshToken.findUnique({ where: { id: expiredToken.id } }),
    );
    expect(expiredStillThere).toBeNull();
    const freshStillThere = await prisma.withoutTenantScope((tx) =>
      tx.refreshToken.findUnique({ where: { id: freshToken.id } }),
    );
    expect(freshStillThere).not.toBeNull();
    await prisma.withoutTenantScope((tx) =>
      tx.refreshToken.delete({ where: { id: freshToken.id } }),
    );

    const archivedRaw = await prisma.withTenant(tenantId, (tx) =>
      tx.rawNotification.findUnique({ where: { id: oldRaw.id } }),
    );
    expect(archivedRaw?.archivedAt).not.toBeNull();

    const prunedTransaction = await prisma.withTenant(tenantId, (tx) =>
      tx.transaction.findUnique({ where: { id: oldTransaction.id } }),
    );
    expect(prunedTransaction).toBeNull();
  }, 20_000);
});
