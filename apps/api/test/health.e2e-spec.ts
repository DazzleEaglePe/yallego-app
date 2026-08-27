import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/bootstrap/configure-application';
import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Health API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
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
