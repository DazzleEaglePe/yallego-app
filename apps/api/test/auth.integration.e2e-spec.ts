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

integrationDescribe('Authentication API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const primaryEmail = `dueno-${suffix}@negocio.pe`;
  const lockedEmail = `bloqueo-${suffix}@negocio.pe`;
  const originalPassword = 'clave-segura-original';
  const newPassword = 'clave-segura-renovada';
  const mailer = {
    sendPasswordResetEmail: vi.fn<(input: { token: string }) => Promise<void>>(),
    sendVerificationEmail: vi.fn<(input: { token: string }) => Promise<void>>(),
  };

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

    mailer.sendPasswordResetEmail.mockResolvedValue();
    mailer.sendVerificationEmail.mockResolvedValue();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
    prisma = app.get(PrismaService);
  }, 30_000);

  afterAll(async () => {
    // `memberships` y `audit_events` tienen Row Level Security: sin
    // `withoutTenantScope` esta limpieza no vería ninguna fila y dejaría
    // negocios huérfanos.
    await prisma.withoutTenantScope(async (tx) => {
      const users = await tx.user.findMany({
        where: { email: { in: [primaryEmail, lockedEmail] } },
        include: { memberships: true },
      });
      const userIds = users.map(({ id }) => id);
      const tenantIds = users.flatMap(({ memberships }) =>
        memberships.map(({ tenantId }) => tenantId),
      );
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    await app.close();
  });

  it('completes registration, verification, rotation, reuse detection and recovery', async () => {
    const agent = request.agent(app.getHttpServer());
    const registration = await agent.post('/v1/auth/register').send({
      email: primaryEmail,
      password: originalPassword,
      full_name: 'María Quispe',
      business_name: `Bodega Prueba ${suffix}`,
    });
    expect(registration.status).toBe(201);
    expect(registration.body.user.email).toBe(primaryEmail);

    const rejectedLogin = await agent.post('/v1/auth/login').send({
      email: primaryEmail,
      password: originalPassword,
    });
    expect(rejectedLogin.status).toBe(403);
    expect(rejectedLogin.body.error.message).toBe(
      'Verifica tu correo electrónico antes de ingresar.',
    );

    const verificationToken = mailer.sendVerificationEmail.mock.calls[0]?.[0].token;
    expect(verificationToken).toMatch(/^ev_/);
    await agent.post('/v1/auth/verify-email').send({ token: verificationToken }).expect(200);

    const login = await agent.post('/v1/auth/login').send({
      email: primaryEmail,
      password: originalPassword,
    });
    expect(login.status).toBe(200);
    expect(login.body.access_token).toEqual(expect.any(String));
    expect(login.body).not.toHaveProperty('refresh_token');
    const firstCookie = firstResponseCookie(login.headers['set-cookie']);
    expect(firstCookie).toContain('yallego_refresh=rt_');
    expect(firstCookie).toContain('HttpOnly');
    expect(firstCookie).toContain('SameSite=Strict');

    const profile = await agent
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);
    expect(profile.body.user.email).toBe(primaryEmail);
    expect(profile.body.tenants[0].role).toBe('OWNER');

    const refreshed = await agent.post('/v1/auth/refresh').send({}).expect(200);
    expect(refreshed.body.access_token).not.toBe(login.body.access_token);
    const secondCookie = firstResponseCookie(refreshed.headers['set-cookie']);
    expect(secondCookie).not.toBe(firstCookie);

    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', firstCookie)
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .set('Cookie', secondCookie)
      .send({})
      .expect(401);

    await agent.post('/v1/auth/forgot-password').send({ email: primaryEmail }).expect(200);
    const resetToken = mailer.sendPasswordResetEmail.mock.calls[0]?.[0].token;
    expect(resetToken).toMatch(/^pr_/);
    await agent
      .post('/v1/auth/reset-password')
      .send({ token: resetToken, password: newPassword })
      .expect(200);

    await agent
      .post('/v1/auth/login')
      .send({ email: primaryEmail, password: originalPassword })
      .expect(401);
    await agent
      .post('/v1/auth/login')
      .send({ email: primaryEmail, password: newPassword })
      .expect(200);
  }, 30_000);

  it('locks the account after five failed attempts inside the window', async () => {
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: lockedEmail,
        password: originalPassword,
        full_name: 'Cuenta Bloqueo',
        business_name: `Negocio Bloqueo ${suffix}`,
      });
    const verificationToken = mailer.sendVerificationEmail.mock.calls[1]?.[0].token;
    await request(app.getHttpServer())
      .post('/v1/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: lockedEmail, password: 'contraseña-equivocada' })
        .expect(401);
    }

    const locked = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: lockedEmail, password: originalPassword })
      .expect(429);
    expect(locked.body.error.details.locked_until).toEqual(expect.any(String));
  }, 30_000);
});

function firstResponseCookie(header: string | string[] | undefined): string {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) throw new Error('Expected Set-Cookie header.');
  return value;
}
