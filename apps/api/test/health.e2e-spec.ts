import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.factory';

describe('GET /health (integración)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication({ bufferLogs: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('AC-000-01: responde 200 con la base de datos disponible', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    const body = healthResponseSchema.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
  });

  it('aplica las cabeceras de seguridad de helmet', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('devuelve errores con el formato ApiError', async () => {
    const res = await request(app.getHttpServer()).get('/no-existe').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, message: expect.any(String) });
  });
});
