import { generateKeyPairSync, randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

/**
 * Verifica el criterio central del Sprint 2: aislamiento entre tenants
 * (docs/07_SEGURIDAD_AUTH.md §6) y la matriz de permisos y equipo
 * (docs/10_PLAN_DESARROLLO.md, Sprint 2).
 */
integrationDescribe('Tenant isolation and team management', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const ownerAEmail = `duena-a-${suffix}@negocio.pe`;
  const ownerBEmail = `dueno-b-${suffix}@negocio.pe`;
  const invitedEmail = `cajero-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  const mailer = {
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendInvitationEmail: vi.fn().mockResolvedValue(undefined),
  };

  let tokenA: string;
  let tokenB: string;
  let memberIdInA: string;
  let ownerMembershipIdInA: string;

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

    tokenA = await registerAndVerify(app, ownerAEmail, `Bodega A ${suffix}`);
    tokenB = await registerAndVerify(app, ownerBEmail, `Bodega B ${suffix}`);

    // El plan FREE admite un solo usuario; se sube a NEGOCIO para poder
    // ejercitar invitaciones y equipo en esta prueba.
    await prisma.withoutTenantScope(async (tx) => {
      const negocioPlan = await tx.plan.findUniqueOrThrow({ where: { code: 'NEGOCIO' } });
      const owner = await tx.user.findUniqueOrThrow({ where: { email: ownerAEmail } });
      await tx.subscription.updateMany({
        where: { tenant: { memberships: { some: { userId: owner.id } } } },
        data: { planId: negocioPlan.id },
      });
    });
  }, 30_000);

  afterAll(async () => {
    await prisma.withoutTenantScope(async (tx) => {
      const users = await tx.user.findMany({
        where: { email: { in: [ownerAEmail, ownerBEmail, invitedEmail] } },
        include: { memberships: true },
      });
      const userIds = users.map(({ id }) => id);
      const tenantIds = users.flatMap(({ memberships }) => memberships.map((m) => m.tenantId));
      await tx.invitation.deleteMany({ where: { tenantId: { in: tenantIds } } });
      await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
    await app.close();
  });

  it('invites, previews and accepts an invitation, creating a new user', async () => {
    const invite = await request(app.getHttpServer())
      .post('/v1/members/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: invitedEmail, role: 'OPERATOR' })
      .expect(201);
    expect(invite.body.status).toBe('PENDING');

    const invitationToken = mailer.sendInvitationEmail.mock.calls[0]?.[0].token as string;
    expect(invitationToken).toMatch(/^iv_/);

    const preview = await request(app.getHttpServer())
      .get(`/v1/invitations/${invitationToken}`)
      .expect(200);
    expect(preview.body).toMatchObject({
      email: invitedEmail,
      role: 'OPERATOR',
      requires_registration: true,
    });

    const accepted = await request(app.getHttpServer())
      .post('/v1/invitations/accept')
      .send({ token: invitationToken, full_name: 'Cajero Nuevo', password })
      .expect(200);
    expect(accepted.body.tenants[0].role).toBe('OPERATOR');

    const duplicate = await request(app.getHttpServer())
      .post('/v1/members/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: invitedEmail, role: 'VIEWER' })
      .expect(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_RESOURCE');
  }, 30_000);

  it('lists members and finds the newly accepted member', async () => {
    const members = await request(app.getHttpServer())
      .get('/v1/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(members.body).toHaveLength(2);
    const operator = (members.body as Array<{ id: string; email: string; role: string }>).find(
      (member) => member.email === invitedEmail,
    );
    expect(operator?.role).toBe('OPERATOR');
    memberIdInA = operator!.id;
  }, 30_000);

  it('denies cross-tenant access as a missing resource, not a forbidden one', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/v1/members/${memberIdInA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ role: 'ADMIN' })
      .expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  }, 30_000);

  it('lets the owner change a member role, but not remove itself or hide from an operator', async () => {
    await request(app.getHttpServer())
      .patch(`/v1/members/${memberIdInA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'ADMIN' })
      .expect(200);

    const forbiddenSelfChange = await request(app.getHttpServer())
      .get('/v1/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const owner = (
      forbiddenSelfChange.body as Array<{ id: string; is_current_user: boolean }>
    ).find((m) => m.is_current_user);
    ownerMembershipIdInA = owner!.id;

    await request(app.getHttpServer())
      .patch(`/v1/members/${ownerMembershipIdInA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'VIEWER' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/v1/members/${ownerMembershipIdInA}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(403);
  }, 30_000);

  it('transfers ownership atomically, leaving exactly one owner', async () => {
    await request(app.getHttpServer())
      .post('/v1/members/transfer-ownership')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ member_id: memberIdInA })
      .expect(200);

    const members = await request(app.getHttpServer())
      .get('/v1/members')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const roles = (members.body as Array<{ id: string; role: string }>).map((m) => m.role);
    expect(roles.filter((role) => role === 'OWNER')).toHaveLength(1);

    const previousOwnerRetriesTransfer = await request(app.getHttpServer())
      .post('/v1/members/transfer-ownership')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ member_id: ownerMembershipIdInA })
      .expect(403);
    expect(previousOwnerRetriesTransfer.body.error.code).toBe('FORBIDDEN');
  }, 30_000);
});

async function registerAndVerify(
  app: INestApplication,
  email: string,
  businessName: string,
): Promise<string> {
  await request(app.getHttpServer()).post('/v1/auth/register').send({
    email,
    password: 'clave-super-segura-1',
    full_name: 'Persona de Prueba',
    business_name: businessName,
  });

  const mailer = app.get(MailerService) as unknown as {
    sendVerificationEmail: { mock: { calls: Array<[{ email: string; token: string }]> } };
  };
  const call = mailer.sendVerificationEmail.mock.calls.find(([input]) => input.email === email);
  await request(app.getHttpServer())
    .post('/v1/auth/verify-email')
    .send({ token: call?.[0].token })
    .expect(200);

  const login = await request(app.getHttpServer())
    .post('/v1/auth/login')
    .send({ email, password: 'clave-super-segura-1' })
    .expect(200);

  return login.body.access_token as string;
}
