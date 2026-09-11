import { generateKeyPairSync, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import { EntitlementService } from '../src/modules/plans/entitlement.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

/**
 * Prueba de concurrencia real del Sprint 9 (docs/14 §4.3 y §8, criterio de
 * salida): bajo N transacciones SQL concurrentes reservando cuota, la suma
 * reservada nunca puede pasar del límite del plan TRIAL. Un mock no prueba
 * esto — depende del bloqueo de fila real de Postgres en `usage_buckets`.
 */
integrationDescribe('EntitlementService quota reservation under concurrency', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let entitlementService: EntitlementService;
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `dueno-quota-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  };
  let tenantId: string;

  beforeAll(async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
      publicKeyEncoding: { format: 'pem', type: 'spki' },
    });
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.BULLMQ_PREFIX = `test-quota-${suffix}`;
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
    entitlementService = app.get(EntitlementService);

    const register = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: ownerEmail,
        password,
        full_name: 'Dueña de Prueba',
        business_name: `Bodega Cuota ${suffix}`,
      });
    tenantId = register.body.tenant.id as string;
  }, 30_000);

  afterAll(async () => {
    await prisma.withoutTenantScope(async (tx) => {
      await tx.tenant.delete({ where: { id: tenantId } });
      await tx.user.deleteMany({ where: { email: ownerEmail } });
    });
    await app.close();
  });

  it('never reserves more than the plan daily limit across concurrent transactions', async () => {
    const trialPlan = await prisma.withoutTenantScope((tx) =>
      tx.plan.findUniqueOrThrow({ where: { code: 'TRIAL' } }),
    );
    const dailyLimit = (trialPlan.limits as { transactions_per_day: number }).transactions_per_day;
    expect(dailyLimit).toBeGreaterThan(0);

    // Recién registrado, el tenant sigue en PENDING_TRIAL, sin trial_ends_at
    // fijado todavía; reserveQuota no depende del estado de acceso, solo del
    // plan — el gate de acceso vive aparte en assertCanOperate (ver
    // IngestNotificationsUseCase). Se dispara bastante más que el límite
    // diario para forzar la contención real de fila en usage_buckets.
    const attempts = dailyLimit + 30;
    const results = await Promise.all(
      Array.from({ length: attempts }, () =>
        prisma.withTenant(tenantId, (tx) => entitlementService.reserveQuota(tx, tenantId, 1)),
      ),
    );

    const totalReserved = results.reduce((sum, result) => sum + result.reservedCount, 0);
    const blockedCount = results.filter((result) => result.reservedCount === 0).length;

    expect(totalReserved).toBe(dailyLimit);
    expect(blockedCount).toBe(attempts - dailyLimit);
    expect(
      results
        .filter((result) => result.reservedCount === 0)
        .every((result) => result.blockedReason === 'DAILY_LIMIT_EXCEEDED'),
    ).toBe(true);

    const bucket = await prisma.withoutTenantScope((tx) =>
      tx.usageBucket.findFirst({ where: { tenantId, windowType: 'DAY' } }),
    );
    expect(bucket?.reserved).toBe(dailyLimit);
    expect(bucket?.used).toBe(0);
  }, 30_000);
});
