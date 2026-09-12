import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { configureApplication } from './configure-application';

@Controller('cors-probe')
class CorsProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [CorsProbeController] })
class CorsProbeModule {}

describe('configureApplication CORS', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [CorsProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app, 'http://localhost:3000', ['http://localhost:3010']);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows an explicitly configured additional origin', async () => {
    const response = await request(app.getHttpServer())
      .options('/v1/cors-probe')
      .set('Origin', 'http://localhost:3010')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3010');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow an origin outside the configured list', async () => {
    const response = await request(app.getHttpServer())
      .options('/v1/cors-probe')
      .set('Origin', 'https://attacker.example')
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
