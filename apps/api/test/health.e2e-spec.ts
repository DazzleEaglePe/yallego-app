import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { REDIS_CLIENT } from '../src/infrastructure/cache/redis.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Health API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Redis es real y compartida entre corridas: sin un prefijo único, jobs
    // huérfanos de otro archivo o de una corrida anterior la contaminarían.
    process.env.BULLMQ_PREFIX = `test-health-${Date.now()}`;
    const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380', {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });
    redis.on('error', () => undefined);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        withoutTenantScope: async (
          operation: (tx: {
            plan: { findMany: () => Promise<Array<{ code: string; limits: object }>> };
          }) => unknown,
        ) =>
          operation({
            plan: {
              findMany: async () => [
                {
                  code: 'FREE',
                  limits: {
                    wallets: 1,
                    devices: 1,
                    transactions_per_month: 100,
                    users: 1,
                    webhooks: 0,
                    websocket_api: false,
                    retention_days: 30,
                    rate_limit_per_minute: 10,
                    support: 'community',
                  },
                },
              ],
            },
          }),
      })
      // La prueba sólo cubre liveness y el envelope 404. Evitamos que un
      // Redis local apagado mantenga conexiones de BullMQ reintentando al cerrar.
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports that the service is ready', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'yallego-api',
    });
    expect(Date.parse(response.body.timestamp as string)).not.toBeNaN();
    expect(response.headers['x-request-id']).toBeTypeOf('string');
  });

  it('uses the documented error envelope and a generated request id', async () => {
    const response = await request(app.getHttpServer()).get('/v1/missing').expect(404);

    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'El recurso solicitado no existe.',
        request_id: response.headers['x-request-id'],
      },
    });
  });
});
