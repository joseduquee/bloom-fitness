import type { INestApplication } from '@nestjs/common';
import { createUserResponseSchema, userListSchema, userSchema } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import {
  createCenter,
  createTestApp,
  createUser,
  login,
  resetDatabase,
  TEST_PASSWORD,
} from './utils';

describe('Usuarios (spec 001, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: { admin: string; trainer: string; client: string };
  let ids: { admin: string; trainer: string; client: string; otherClient: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const centerId = (await createCenter(prisma)).id;
    const admin = await createUser(prisma, centerId, { email: 'admin@bloom.test', role: 'ADMIN' });
    const trainer = await createUser(prisma, centerId, {
      email: 'coach@bloom.test',
      role: 'TRAINER',
    });
    const client = await createUser(prisma, centerId, {
      email: 'cliente@bloom.test',
      role: 'CLIENT',
    });
    const otherClient = await createUser(prisma, centerId, {
      email: 'otro@bloom.test',
      role: 'CLIENT',
    });
    ids = { admin: admin.id, trainer: trainer.id, client: client.id, otherClient: otherClient.id };
    tokens = {
      admin: (await login(app, 'admin@bloom.test')).accessToken,
      trainer: (await login(app, 'coach@bloom.test')).accessToken,
      client: (await login(app, 'cliente@bloom.test')).accessToken,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  describe('control de acceso', () => {
    it('AC-001-08: un cliente o un entrenador no pueden crear usuarios (403)', async () => {
      const body = { email: 'n@bloom.test', firstName: 'N', lastName: 'N', role: 'CLIENT' };
      await http().post('/users').set(as(tokens.client)).send(body).expect(403);
      await http().post('/users').set(as(tokens.trainer)).send(body).expect(403);
    });

    it('AC-001-08: un cliente no puede listar usuarios (403)', async () => {
      await http().get('/users').set(as(tokens.client)).expect(403);
    });

    it('AC-001-09: un cliente solo se ve a sí mismo; el resto responde 404', async () => {
      await http().get(`/users/${ids.client}`).set(as(tokens.client)).expect(200);
      await http().get(`/users/${ids.otherClient}`).set(as(tokens.client)).expect(404);
      await http().get(`/users/${ids.admin}`).set(as(tokens.client)).expect(404);
    });

    it('el entrenador solo ve clientes', async () => {
      const res = await http().get('/users').set(as(tokens.trainer)).expect(200);
      const list = userListSchema.parse(res.body);
      expect(list.items.every((user) => user.role === 'CLIENT')).toBe(true);
      await http().get(`/users/${ids.admin}`).set(as(tokens.trainer)).expect(404);
    });
  });

  describe('alta y activación', () => {
    it('AC-001-10 y AC-001-16: crea el usuario pendiente y devuelve un enlace que permite activarlo', async () => {
      const res = await http()
        .post('/users')
        .set(as(tokens.admin))
        .send({
          email: 'Nueva@Bloom.test',
          firstName: 'Nueva',
          lastName: 'Clienta',
          alias: 'Nue',
          role: 'CLIENT',
        })
        .expect(201);
      const { user, activationUrl } = createUserResponseSchema.parse(res.body);
      expect(user).toMatchObject({ email: 'nueva@bloom.test', status: 'PENDING' });

      // Mientras no active la cuenta no puede iniciar sesión.
      await http()
        .post('/auth/login')
        .send({ email: 'nueva@bloom.test', password: TEST_PASSWORD })
        .expect(401);

      const token = new URL(activationUrl).searchParams.get('token');
      await http()
        .post('/auth/activate')
        .send({ token, password: 'mi-contraseña-nueva' })
        .expect(204);
      await login(app, 'nueva@bloom.test', 'mi-contraseña-nueva');

      // El enlace es de un solo uso.
      await http()
        .post('/auth/activate')
        .send({ token, password: 'otra-contraseña-x' })
        .expect(401);
    });

    it('AC-001-11: un correo repetido devuelve 409', async () => {
      await http()
        .post('/users')
        .set(as(tokens.admin))
        .send({ email: 'cliente@bloom.test', firstName: 'X', lastName: 'Y', role: 'CLIENT' })
        .expect(409);
    });

    it('AC-001-16: un enlace nuevo invalida el anterior', async () => {
      const created = await http()
        .post('/users')
        .set(as(tokens.admin))
        .send({ email: 'p@bloom.test', firstName: 'P', lastName: 'Q', role: 'TRAINER' })
        .expect(201);
      const { user, activationUrl: oldUrl } = createUserResponseSchema.parse(created.body);
      await http().post(`/users/${user.id}/activation-link`).set(as(tokens.admin)).expect(200);

      const oldToken = new URL(oldUrl).searchParams.get('token');
      await http()
        .post('/auth/activate')
        .send({ token: oldToken, password: 'contraseña-larga' })
        .expect(401);
    });
  });

  describe('edición y desactivación', () => {
    it('edita los datos de un usuario', async () => {
      const res = await http()
        .patch(`/users/${ids.client}`)
        .set(as(tokens.admin))
        .send({ alias: 'Cli', firstName: 'Cliente' })
        .expect(200);
      expect(userSchema.parse(res.body)).toMatchObject({ alias: 'Cli', firstName: 'Cliente' });
    });

    it('AC-001-12: un usuario desactivado pierde el acceso al momento y conserva sus datos', async () => {
      const session = await login(app, 'otro@bloom.test');
      await http().post(`/users/${ids.otherClient}/deactivate`).set(as(tokens.admin)).expect(200);

      await http().get('/auth/me').set(as(session.accessToken)).expect(401);
      await http().post('/auth/refresh').set('Cookie', session.cookie).expect(401);
      await http()
        .post('/auth/login')
        .send({ email: 'otro@bloom.test', password: TEST_PASSWORD })
        .expect(401);

      const res = await http().get(`/users/${ids.otherClient}`).set(as(tokens.admin)).expect(200);
      expect(res.body.status).toBe('INACTIVE');
    });

    it('un administrador no puede desactivarse a sí mismo', async () => {
      await http().post(`/users/${ids.admin}/deactivate`).set(as(tokens.admin)).expect(422);
    });
  });

  describe('listado', () => {
    it('AC-001-14: busca por nombre o correo, filtra por rol y pagina', async () => {
      const search = await http()
        .get('/users')
        .query({ search: 'OTRO' })
        .set(as(tokens.admin))
        .expect(200);
      expect(userListSchema.parse(search.body).items.map((u) => u.email)).toEqual([
        'otro@bloom.test',
      ]);

      const byRole = await http()
        .get('/users')
        .query({ role: 'CLIENT' })
        .set(as(tokens.admin))
        .expect(200);
      expect(userListSchema.parse(byRole.body).total).toBe(2);

      const page = await http()
        .get('/users')
        .query({ pageSize: 1, page: 2 })
        .set(as(tokens.admin))
        .expect(200);
      const parsed = userListSchema.parse(page.body);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.total).toBe(4);
    });
  });
});
