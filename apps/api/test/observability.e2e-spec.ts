import { randomUUID } from 'node:crypto';

import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ParseStatus } from '@prisma/client';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { REDIS_CLIENT } from '../src/infrastructure/cache/redis.module';
import type { WebhookDeliveryJob } from '../src/infrastructure/queue/queue.constants';
import { WEBHOOK_QUEUE } from '../src/infrastructure/queue/queue.constants';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MailerService } from '../src/infrastructure/mailer/mailer.service';
import { MetricsService } from '../src/infrastructure/observability/metrics.service';
import { ParsingSuccessAlertScheduler } from '../src/modules/observability/parsing-success-alert.scheduler';
import { WebhookQueueDepthAlertScheduler } from '../src/modules/observability/webhook-queue-depth-alert.scheduler';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;

/**
 * Sprint 8 — Observabilidad (RNF-OBS-001 a 008). Cubre lo que un smoke test
 * HTTP no puede: que `/health/ready` de verdad consulte Postgres/Redis, que
 * `/metrics` sirva Prometheus real, y que las dos alertas de plataforma
 * (tasa de parsing, profundidad de cola) disparen un correo y luego se
 * deduplican mientras el problema sigue activo.
 */
integrationDescribe('Observability: health, metrics and platform alerts', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `dueno-obs-${suffix}@negocio.pe`;
  const password = 'clave-super-segura-1';
  const mailer = {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPlatformAlertEmail: vi.fn().mockResolvedValue(undefined),
  };
  const platformAdminEmail = `admin-obs-${suffix}@yallego.internal`;
  let ownerToken: string;
  let tenantId: string;
  let deviceId: string;
  let redis: Redis;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = databaseUrl;
    process.env.BULLMQ_PREFIX = `test-obs-${suffix}`;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailerService)
      .useValue(mailer)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(REDIS_CLIENT);

    // `ConfigModule.forRoot({ validate })` valida `process.env` una única
    // vez, de forma SÍNCRONA, en el momento en que se evalúa el decorador
    // `@Module` de `AppModule` — es decir, al importar el archivo, ANTES de
    // que este `beforeAll` corra. Para una clave con `.default()` en el
    // esquema Zod, `ConfigService.get()` siempre encuentra ese valor ya
    // "horneado" y nunca cae a leer `process.env` en vivo (ver precedencia
    // en `getFromValidatedEnv` de `@nestjs/config`) — mutar `process.env`
    // aquí no tendría ningún efecto. `ConfigService.set()` sí funciona: escribe
    // en `internalConfig`, que tiene la precedencia más alta.
    const config = app.get(ConfigService);
    // Umbral bajo a propósito: con solo un puñado de jobs/notificaciones de
    // prueba se puede cruzar el umbral sin tener que generar cientos.
    config.set('WEBHOOK_QUEUE_DEPTH_ALERT_THRESHOLD', 2);
    config.set('PARSING_ALERT_MIN_SAMPLE_SIZE', 5);
    // Las claves de deduplicación de alertas son globales (no llevan sufijo
    // de esta corrida) porque en producción deben serlo — se limpian aquí
    // para que una corrida previa dentro de la última hora no las deje
    // "ya alertadas" y opaque falsamente esta prueba.
    await redis.del('alert:parsing-success:YAPE', 'alert:webhook-queue-depth');

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: ownerEmail,
        password,
        full_name: 'Dueña de Prueba',
        business_name: `Bodega Observabilidad ${suffix}`,
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
    const pairResponse = await request(app.getHttpServer())
      .post('/internal/v1/devices/pair')
      .send({ code: pairingCode.body.code, device: {} })
      .expect(201);
    deviceId = pairResponse.body.device_id as string;

    await prisma.withoutTenantScope((tx) =>
      tx.platformAdmin.create({
        data: {
          email: platformAdminEmail,
          passwordHash: 'no-usado-en-esta-prueba',
          fullName: 'Admin de Prueba',
          isActive: true,
        },
      }),
    );
  }, 30_000);

  afterAll(async () => {
    await prisma.withoutTenantScope(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: ownerEmail },
        include: { memberships: true },
      });
      if (user) {
        const tid = user.memberships[0]?.tenantId;
        if (tid) await tx.tenant.delete({ where: { id: tid } });
        await tx.user.delete({ where: { id: user.id } });
      }
      await tx.platformAdmin.deleteMany({ where: { email: { contains: suffix } } });
    });
    await app.close();
  });

  it('GET /v1/health/ready confirms real connectivity to Postgres and Redis', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health/ready').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' }, redis: { status: 'up' } },
    });
  });

  it('GET /metrics serves Prometheus text exposition format', async () => {
    await request(app.getHttpServer()).get('/v1/health').expect(200); // genera al menos una muestra

    const response = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('# TYPE yallego_http_requests_total counter');
    expect(response.text).toContain('# TYPE yallego_parsing_success_rate gauge');
    expect(response.text).toContain('process_cpu_user_seconds_total'); // métricas por defecto de prom-client
  });

  it("alerts platform admins when a wallet's parsing success rate drops below the threshold, then deduplicates", async () => {
    const scheduler = app.get(ParsingSuccessAlertScheduler);
    const metrics = app.get(MetricsService);

    // El chequeo agrega TODOS los tenants (es de plataforma): con la suite
    // completa corriendo en paralelo, otros archivos también generan
    // transacciones reales de YAPE dentro de la misma ventana de una hora.
    // No se puede borrar esa data (algunas ya tienen una `Transaction` que
    // referencia la fila por FK) ni asumir un total exacto — en cambio, se
    // agrega un volumen de fallos tan grande que la tasa agregada queda muy
    // por debajo del umbral sin importar cuánto hayan aportado los demás.
    const UNMATCHED_COUNT = 300;
    await prisma.withTenant(tenantId, (tx) =>
      tx.rawNotification.createMany({
        data: Array.from({ length: UNMATCHED_COUNT }, () => ({
          tenantId,
          deviceId,
          packageName: 'com.bcp.innovacxion.yapeapp',
          dedupeHash: randomUUID(),
          postedAt: new Date(),
          receivedAt: new Date(),
          parseStatus: ParseStatus.UNMATCHED,
        })),
      }),
    );

    await scheduler.checkParsingSuccessRate();

    // La consulta agrega TODOS los administradores de plataforma activos en
    // la base compartida (correcto: en producción deben enterarse todos) —
    // por eso se filtra por el correo del admin de ESTA prueba en vez de
    // asumir que fue la única llamada al mock.
    const callsToMyAdmin = () =>
      mailer.sendPlatformAlertEmail.mock.calls.filter(
        ([call]) => call.email === platformAdminEmail && call.subject.includes('YAPE'),
      );

    expect(callsToMyAdmin()).toHaveLength(1);
    const gaugeValue = (await metrics.registry.getMetricsAsJSON()).find(
      (m) => m.name === 'yallego_parsing_success_rate',
    );
    expect(
      gaugeValue?.values.find(
        (v: { labels: { wallet_code?: string } }) => v.labels.wallet_code === 'YAPE',
      )?.value,
    ).toBeLessThan(0.95);

    // Corre de nuevo de inmediato: la deduplicación por Redis evita un segundo correo.
    await scheduler.checkParsingSuccessRate();
    expect(callsToMyAdmin()).toHaveLength(1);
  }, 30_000);

  it('alerts platform admins when the webhook delivery queue backlog exceeds the threshold', async () => {
    const scheduler = app.get(WebhookQueueDepthAlertScheduler);
    const queue = app.get<Queue<WebhookDeliveryJob>>(getQueueToken(WEBHOOK_QUEUE));

    await queue.pause();
    const jobs = await queue.addBulk(
      Array.from({ length: 3 }, () => ({
        name: 'delivery',
        data: { deliveryId: randomUUID(), tenantId },
      })),
    );

    const callsToMyAdmin = () =>
      mailer.sendPlatformAlertEmail.mock.calls.filter(
        ([call]) => call.email === platformAdminEmail && call.subject.includes('cola de entrega'),
      );

    try {
      await scheduler.checkQueueDepth();
      expect(callsToMyAdmin()).toHaveLength(1);

      await scheduler.checkQueueDepth();
      expect(callsToMyAdmin()).toHaveLength(1); // deduplicado
    } finally {
      await Promise.all(jobs.map((job) => job.remove()));
      await queue.resume();
    }
  }, 30_000);
});
