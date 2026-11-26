import type { INestApplication } from '@nestjs/common';
import { workoutTemplateListSchema, workoutTemplateSchema } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createCenter, createTestApp, createUser, login, resetDatabase } from './utils';

describe('Plantillas (spec 003, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let centerId: string;
  let tokens: { trainer: string; client: string };
  let exercises: { squat: string; bench: string; row: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    centerId = (await createCenter(prisma)).id;
    await createUser(prisma, centerId, { email: 'coach@bloom.test', role: 'TRAINER' });
    await createUser(prisma, centerId, { email: 'cliente@bloom.test', role: 'CLIENT' });
    tokens = {
      trainer: (await login(app, 'coach@bloom.test')).accessToken,
      client: (await login(app, 'cliente@bloom.test')).accessToken,
    };
    const exercise = (name: string) =>
      prisma.exercise.create({
        data: {
          centerId,
          name,
          primaryMuscle: 'QUADRICEPS',
          equipment: 'BARBELL',
          difficulty: 'BEGINNER',
        },
      });
    exercises = {
      squat: (await exercise('Sentadilla')).id,
      bench: (await exercise('Press de banca')).id,
      row: (await exercise('Remo con barra')).id,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const item = (exerciseId: string, overrides: Record<string, unknown> = {}) => ({
    exerciseId,
    sets: 4,
    reps: '8-10',
    targetLoadKg: 60,
    restSeconds: 90,
    ...overrides,
  });
  const create = async (body: Record<string, unknown>) => {
    const res = await http().post('/templates').set(as(tokens.trainer)).send(body).expect(201);
    return workoutTemplateSchema.parse(res.body);
  };

  it('AC-003-07 y AC-003-08: crea una plantilla con sus ejercicios en orden', async () => {
    const template = await create({
      name: 'Día A · Pierna',
      goal: 'Fuerza',
      items: [
        item(exercises.squat, { targetLoadKg: 82.5 }),
        item(exercises.row, { sets: 3, reps: '12', targetLoadKg: null, notes: 'Pausa arriba' }),
      ],
    });

    expect(template).toMatchObject({ name: 'Día A · Pierna', goal: 'Fuerza' });
    expect(template.items).toEqual([
      expect.objectContaining({
        position: 0,
        exercise: expect.objectContaining({
          id: exercises.squat,
          name: 'Sentadilla',
          isActive: true,
        }),
        sets: 4,
        reps: '8-10',
        targetLoadKg: 82.5,
        restSeconds: 90,
        notes: null,
      }),
      expect.objectContaining({ position: 1, targetLoadKg: null, notes: 'Pausa arriba' }),
    ]);
  });

  it('AC-003-08: valida series, repeticiones, carga y descanso (400)', async () => {
    const res = await http()
      .post('/templates')
      .set(as(tokens.trainer))
      .send({
        name: 'Día A',
        items: [item(exercises.squat, { sets: 12, reps: '', restSeconds: -1 })],
      })
      .expect(400);
    expect(res.body.details.map((detail: { path: string }) => detail.path)).toEqual([
      'items.0.sets',
      'items.0.reps',
      'items.0.restSeconds',
    ]);
  });

  it('solo entrenadores y administradores gestionan plantillas (403)', async () => {
    await http().get('/templates').set(as(tokens.client)).expect(403);
  });

  it('rechaza ejercicios de otro centro o desactivados (422)', async () => {
    const other = await createCenter(prisma, 'Otro centro');
    const foreign = await prisma.exercise.create({
      data: {
        centerId: other.id,
        name: 'Ajeno',
        primaryMuscle: 'CORE',
        equipment: 'OTHER',
        difficulty: 'BEGINNER',
      },
    });
    await http()
      .post('/templates')
      .set(as(tokens.trainer))
      .send({ name: 'Día A', items: [item(foreign.id)] })
      .expect(422);

    await prisma.exercise.update({ where: { id: exercises.row }, data: { isActive: false } });
    const res = await http()
      .post('/templates')
      .set(as(tokens.trainer))
      .send({ name: 'Día A', items: [item(exercises.row)] })
      .expect(422);
    expect(res.body.message).toBe('No se pueden añadir ejercicios desactivados: Remo con barra.');
  });

  it('AC-003-09: reordena, añade y quita ejercicios y guarda el orden', async () => {
    const template = await create({
      name: 'Día A',
      items: [item(exercises.squat), item(exercises.bench)],
    });

    const res = await http()
      .put(`/templates/${template.id}`)
      .set(as(tokens.trainer))
      .send({
        name: 'Día A',
        items: [item(exercises.row), item(exercises.squat, { sets: 5 })],
      })
      .expect(200);

    const updated = workoutTemplateSchema.parse(res.body);
    expect(updated.items.map((i) => [i.position, i.exercise.name, i.sets])).toEqual([
      [0, 'Remo con barra', 4],
      [1, 'Sentadilla', 5],
    ]);
    const stored = await http()
      .get(`/templates/${template.id}`)
      .set(as(tokens.trainer))
      .expect(200);
    expect(workoutTemplateSchema.parse(stored.body).items.map((i) => i.exercise.name)).toEqual([
      'Remo con barra',
      'Sentadilla',
    ]);
  });

  it('AC-003-04: una plantilla con un ejercicio desactivado sigue funcionando y se puede editar', async () => {
    const template = await create({
      name: 'Día A',
      items: [item(exercises.squat), item(exercises.bench)],
    });
    await prisma.exercise.update({ where: { id: exercises.squat }, data: { isActive: false } });

    const res = await http().get(`/templates/${template.id}`).set(as(tokens.trainer)).expect(200);
    expect(workoutTemplateSchema.parse(res.body).items[0]?.exercise).toMatchObject({
      name: 'Sentadilla',
      isActive: false,
    });
    await http()
      .put(`/templates/${template.id}`)
      .set(as(tokens.trainer))
      .send({ name: 'Día A (editada)', items: [item(exercises.bench), item(exercises.squat)] })
      .expect(200);
  });

  it('AC-003-10: duplica una plantilla con todos sus ejercicios', async () => {
    const template = await create({
      name: 'Día A',
      goal: 'Fuerza',
      items: [item(exercises.squat, { targetLoadKg: 70.25 }), item(exercises.bench)],
    });

    const res = await http()
      .post(`/templates/${template.id}/duplicate`)
      .set(as(tokens.trainer))
      .expect(201);
    const copy = workoutTemplateSchema.parse(res.body);

    expect(copy.id).not.toBe(template.id);
    expect(copy).toMatchObject({ name: 'Día A (copia)', goal: 'Fuerza' });
    expect(
      copy.items.map(({ position, exercise, targetLoadKg }) => [
        position,
        exercise.id,
        targetLoadKg,
      ]),
    ).toEqual([
      [0, exercises.squat, 70.25],
      [1, exercises.bench, 60],
    ]);
  });

  it('lista las plantillas con su número de ejercicios y permite buscar', async () => {
    await create({ name: 'Día B · Empuje', items: [item(exercises.bench)] });
    await create({ name: 'Día A · Pierna', items: [item(exercises.squat), item(exercises.row)] });

    const res = await http().get('/templates?search=pierna').set(as(tokens.trainer)).expect(200);
    const list = workoutTemplateListSchema.parse(res.body);
    expect(list.items.map((t) => [t.name, t.exerciseCount])).toEqual([['Día A · Pierna', 2]]);
  });

  it('borra una plantilla que no se usa y no deja borrar una usada en una rutina (409)', async () => {
    const unused = await create({ name: 'Suelta', items: [item(exercises.squat)] });
    await http().delete(`/templates/${unused.id}`).set(as(tokens.trainer)).expect(204);
    await http().get(`/templates/${unused.id}`).set(as(tokens.trainer)).expect(404);

    const used = await create({ name: 'Usada', items: [item(exercises.squat)] });
    const client = await prisma.user.findUniqueOrThrow({ where: { email: 'cliente@bloom.test' } });
    await http()
      .post(`/clients/${client.id}/routines`)
      .set(as(tokens.trainer))
      .send({ name: 'Rutina', startsOn: '2026-12-01', templateIds: [used.id] })
      .expect(201);
    const res = await http().delete(`/templates/${used.id}`).set(as(tokens.trainer)).expect(409);
    expect(res.body.message).toContain('se usa en alguna rutina');
  });
});
