import type { INestApplication } from '@nestjs/common';
import { EXERCISE_MEDIA_MAX_BYTES, exerciseListSchema, exerciseSchema } from '@bloom/shared';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createCenter, createTestApp, createUser, login, resetDatabase } from './utils';

/** GIF mínimo válido de 1×1 píxel. */
const TINY_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const MEDIA_DIR = resolve(process.env.MEDIA_DIR ?? 'uploads/test');

const squat = {
  name: 'Sentadilla con barra',
  primaryMuscle: 'QUADRICEPS',
  equipment: 'BARBELL',
  difficulty: 'INTERMEDIATE',
  instructions: 'Baja hasta la paralela.',
};

describe('Catálogo de ejercicios (spec 003, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: { admin: string; trainer: string; client: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await rm(MEDIA_DIR, { recursive: true, force: true });
    const center = await createCenter(prisma);
    await createUser(prisma, center.id, { email: 'admin@bloom.test', role: 'ADMIN' });
    await createUser(prisma, center.id, { email: 'coach@bloom.test', role: 'TRAINER' });
    await createUser(prisma, center.id, { email: 'cliente@bloom.test', role: 'CLIENT' });
    tokens = {
      admin: (await login(app, 'admin@bloom.test')).accessToken,
      trainer: (await login(app, 'coach@bloom.test')).accessToken,
      client: (await login(app, 'cliente@bloom.test')).accessToken,
    };
  });

  afterAll(async () => {
    await rm(MEDIA_DIR, { recursive: true, force: true });
    await app.close();
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const create = async (body: Record<string, unknown> = squat, token = tokens.trainer) => {
    const res = await http().post('/exercises').set(as(token)).send(body).expect(201);
    return exerciseSchema.parse(res.body);
  };
  const list = async (query = '') => {
    const res = await http().get(`/exercises${query}`).set(as(tokens.trainer)).expect(200);
    return exerciseListSchema.parse(res.body);
  };
  const upload = (id: string, file: Buffer, filename = 'demo.gif') =>
    http()
      .put(`/exercises/${id}/media`)
      .set(as(tokens.trainer))
      .attach('file', file, { filename, contentType: 'image/gif' });

  it('AC-003-01: el entrenador crea un ejercicio con todos sus datos', async () => {
    const exercise = await create();
    expect(exercise).toMatchObject({ ...squat, isActive: true, mediaUrl: null });
  });

  it('el administrador también gestiona el catálogo, pero un cliente no (403)', async () => {
    await create({ ...squat, name: 'Remo con barra' }, tokens.admin);
    await http().get('/exercises').set(as(tokens.client)).expect(403);
    await http().post('/exercises').set(as(tokens.client)).send(squat).expect(403);
  });

  it('valida los datos del ejercicio (400)', async () => {
    const res = await http()
      .post('/exercises')
      .set(as(tokens.trainer))
      .send({ ...squat, name: 'A', primaryMuscle: 'NARIZ' })
      .expect(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'name' }),
        expect.objectContaining({ path: 'primaryMuscle' }),
      ]),
    );
  });

  it('AC-003-03: el nombre es único en el centro sin distinguir mayúsculas (409)', async () => {
    const first = await create();
    const res = await http()
      .post('/exercises')
      .set(as(tokens.trainer))
      .send({ ...squat, name: '  SENTADILLA con BARRA ' })
      .expect(409);
    expect(res.body.message).toBe('Ya existe un ejercicio con ese nombre.');

    const other = await create({ ...squat, name: 'Prensa de piernas' });
    await http()
      .patch(`/exercises/${other.id}`)
      .set(as(tokens.trainer))
      .send({ name: 'sentadilla con barra' })
      .expect(409);
    // Cambiar solo las mayúsculas del propio nombre sí se permite.
    await http()
      .patch(`/exercises/${first.id}`)
      .set(as(tokens.trainer))
      .send({ name: 'Sentadilla Con Barra' })
      .expect(200);
  });

  it('AC-003-03: otro centro puede tener un ejercicio con el mismo nombre', async () => {
    await create();
    const otherCenter = await createCenter(prisma, 'Otro centro');
    await createUser(prisma, otherCenter.id, { email: 'otro@bloom.test', role: 'TRAINER' });
    const { accessToken } = await login(app, 'otro@bloom.test');
    await http().post('/exercises').set(as(accessToken)).send(squat).expect(201);
  });

  it('no deja ver ni editar ejercicios de otro centro (404)', async () => {
    const exercise = await create();
    const otherCenter = await createCenter(prisma, 'Otro centro');
    await createUser(prisma, otherCenter.id, { email: 'otro@bloom.test', role: 'TRAINER' });
    const { accessToken } = await login(app, 'otro@bloom.test');
    await http().get(`/exercises/${exercise.id}`).set(as(accessToken)).expect(404);
    await http().patch(`/exercises/${exercise.id}`).set(as(accessToken)).send({}).expect(404);
  });

  it('AC-003-04: desactivar lo oculta del catálogo pero sigue disponible por su id', async () => {
    const exercise = await create();
    await create({ ...squat, name: 'Prensa de piernas' });

    const res = await http()
      .post(`/exercises/${exercise.id}/deactivate`)
      .set(as(tokens.trainer))
      .expect(200);
    expect(exerciseSchema.parse(res.body).isActive).toBe(false);

    expect((await list()).items.map((item) => item.name)).toEqual(['Prensa de piernas']);
    expect((await list('?includeInactive=true')).total).toBe(2);
    await http().get(`/exercises/${exercise.id}`).set(as(tokens.trainer)).expect(200);

    await http().post(`/exercises/${exercise.id}/reactivate`).set(as(tokens.trainer)).expect(200);
    expect((await list()).total).toBe(2);
  });

  it('AC-003-05: busca por nombre y filtra por músculo y equipamiento', async () => {
    await create();
    await create({ ...squat, name: 'Sentadilla goblet', equipment: 'KETTLEBELL' });
    await create({ ...squat, name: 'Press de banca', primaryMuscle: 'CHEST' });

    const names = async (query: string) => (await list(query)).items.map((item) => item.name);
    expect(await names('?search=SENTADILLA')).toEqual([
      'Sentadilla con barra',
      'Sentadilla goblet',
    ]);
    expect(await names('?muscle=CHEST')).toEqual(['Press de banca']);
    expect(await names('?muscle=QUADRICEPS&equipment=KETTLEBELL')).toEqual(['Sentadilla goblet']);
    await http().get('/exercises?muscle=NARIZ').set(as(tokens.trainer)).expect(400);
  });

  describe('AC-003-02: GIF del ejercicio', () => {
    it('sube el GIF, lo sirve en /media y devuelve su URL', async () => {
      const exercise = await create();
      const res = await upload(exercise.id, TINY_GIF).expect(200);
      const { mediaUrl } = exerciseSchema.parse(res.body);
      expect(mediaUrl).toMatch(/^http:\/\/localhost:3000\/media\/exercises\/[0-9a-f-]{36}\.gif$/);

      const path = new URL(mediaUrl ?? '').pathname;
      const served = await http().get(path).expect(200);
      expect(served.headers['content-type']).toBe('image/gif');
      expect(served.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });

    it('al reemplazarlo borra el anterior y al quitarlo borra el archivo', async () => {
      const exercise = await create();
      const first = exerciseSchema.parse((await upload(exercise.id, TINY_GIF).expect(200)).body);
      const second = exerciseSchema.parse((await upload(exercise.id, TINY_GIF).expect(200)).body);
      const fileOf = (url: string | null) =>
        resolve(MEDIA_DIR, new URL(url ?? '').pathname.slice(7));

      expect(second.mediaUrl).not.toBe(first.mediaUrl);
      await expect(readFile(fileOf(first.mediaUrl))).rejects.toThrow();
      await expect(readFile(fileOf(second.mediaUrl))).resolves.toEqual(TINY_GIF);

      const removed = await http()
        .delete(`/exercises/${exercise.id}/media`)
        .set(as(tokens.trainer))
        .expect(200);
      expect(exerciseSchema.parse(removed.body).mediaUrl).toBeNull();
      await expect(readFile(fileOf(second.mediaUrl))).rejects.toThrow();
    });

    it('rechaza un archivo que no es GIF aunque diga serlo (415)', async () => {
      const exercise = await create();
      const res = await upload(exercise.id, PNG, 'trampa.gif').expect(415);
      expect(res.body.message).toBe('El archivo debe ser un GIF.');
    });

    it('rechaza un GIF de más de 5 MB (413)', async () => {
      const exercise = await create();
      const big = Buffer.concat([TINY_GIF, Buffer.alloc(EXERCISE_MEDIA_MAX_BYTES)]);
      const res = await upload(exercise.id, big).expect(413);
      expect(res.body.message).toBe('El GIF no puede superar 5 MB.');
    });

    it('exige adjuntar el archivo (400)', async () => {
      const exercise = await create();
      await http().put(`/exercises/${exercise.id}/media`).set(as(tokens.trainer)).expect(400);
    });
  });
});
