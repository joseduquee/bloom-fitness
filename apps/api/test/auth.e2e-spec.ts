import type { INestApplication } from '@nestjs/common';
import { sessionResponseSchema } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LoginAttemptsService } from '../src/auth/login-attempts.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import {
  createCenter,
  createTestApp,
  createUser,
  login,
  refreshCookie,
  resetDatabase,
  TEST_PASSWORD,
} from './utils';

describe('Autenticación (spec 001, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let centerId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    app.get(LoginAttemptsService).clear();
    centerId = (await createCenter(prisma)).id;
    await createUser(prisma, centerId, { email: 'ana@bloom.test', role: 'TRAINER' });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('POST /auth/login', () => {
    it('AC-001-01: devuelve token de acceso y fija la cookie de refresco segura', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: 'ANA@bloom.test', password: TEST_PASSWORD })
        .expect(200);

      const body = sessionResponseSchema.parse(res.body);
      expect(body.user.email).toBe('ana@bloom.test');
      expect(body.expiresIn).toBe(900);
      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toMatch(/bloom_rt=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/auth/);
    });

    it('AC-001-02: credenciales incorrectas devuelven 401 con mensaje genérico', async () => {
      const wrongPassword = await http()
        .post('/auth/login')
        .send({ email: 'ana@bloom.test', password: 'incorrecta' })
        .expect(401);
      const unknownEmail = await http()
        .post('/auth/login')
        .send({ email: 'nadie@bloom.test', password: 'incorrecta' })
        .expect(401);
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it('AC-001-02: un usuario desactivado no puede entrar', async () => {
      await createUser(prisma, centerId, {
        email: 'baja@bloom.test',
        role: 'CLIENT',
        isActive: false,
      });
      await http()
        .post('/auth/login')
        .send({ email: 'baja@bloom.test', password: TEST_PASSWORD })
        .expect(401);
    });

    it('AC-001-03: tras 5 fallos responde 429 aunque la contraseña sea correcta', async () => {
      for (let i = 0; i < 5; i++) {
        await http()
          .post('/auth/login')
          .send({ email: 'ana@bloom.test', password: 'mal' })
          .expect(401);
      }
      await http()
        .post('/auth/login')
        .send({ email: 'ana@bloom.test', password: TEST_PASSWORD })
        .expect(429);
    });

    it('rechaza peticiones mal formadas con 400 y el detalle del campo', async () => {
      const res = await http().post('/auth/login').send({ email: 'no-es-un-correo' }).expect(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'email' })]),
      );
    });
  });

  describe('POST /auth/refresh', () => {
    it('AC-001-04: emite un token nuevo y rota la cookie', async () => {
      const { cookie } = await login(app, 'ana@bloom.test');
      const res = await http().post('/auth/refresh').set('Cookie', cookie).expect(200);
      sessionResponseSchema.parse(res.body);
      expect(refreshCookie(res.headers['set-cookie'])).not.toBe(cookie);
    });

    it('AC-001-05: reutilizar un token ya usado revoca todas las sesiones del usuario', async () => {
      const first = await login(app, 'ana@bloom.test');
      const otherDevice = await login(app, 'ana@bloom.test');

      const rotated = await http().post('/auth/refresh').set('Cookie', first.cookie).expect(200);
      const newCookie = refreshCookie(rotated.headers['set-cookie']);

      // Alguien reutiliza el token antiguo…
      await http().post('/auth/refresh').set('Cookie', first.cookie).expect(401);
      // …y a partir de ahí no funciona ninguna sesión del usuario.
      await http().post('/auth/refresh').set('Cookie', newCookie).expect(401);
      await http().post('/auth/refresh').set('Cookie', otherDevice.cookie).expect(401);
    });

    it('sin cookie responde 401', async () => {
      await http().post('/auth/refresh').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('AC-001-06: revoca el token y borra la cookie', async () => {
      const { cookie } = await login(app, 'ana@bloom.test');
      const res = await http().post('/auth/logout').set('Cookie', cookie).expect(204);
      expect(String(res.headers['set-cookie'])).toMatch(/bloom_rt=;/);
      await http().post('/auth/refresh').set('Cookie', cookie).expect(401);
    });
  });

  describe('Rutas protegidas', () => {
    it('AC-001-07: sin token o con un token falso responden 401', async () => {
      await http().get('/auth/me').expect(401);
      await http().get('/auth/me').set('Authorization', 'Bearer no.es.valido').expect(401);
    });

    it('GET /auth/me devuelve el usuario de la sesión', async () => {
      const { accessToken } = await login(app, 'ana@bloom.test');
      const res = await http()
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body).toMatchObject({ email: 'ana@bloom.test', role: 'TRAINER' });
    });

    it('/health sigue siendo público', async () => {
      await http().get('/health').expect(200);
    });
  });
});
