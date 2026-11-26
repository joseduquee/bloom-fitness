import type { INestApplication } from '@nestjs/common';
import { routineListSchema, routineSchema } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createCenter, createTestApp, createUser, login, resetDatabase } from './utils';

describe('Rutinas (spec 003, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let clientId: string;
  let otherClientId: string;
  let trainerId: string;
  let templates: { a: string; b: string; c: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const centerId = (await createCenter(prisma)).id;
    trainerId = (await createUser(prisma, centerId, { email: 'coach@bloom.test', role: 'TRAINER' }))
      .id;
    clientId = (await createUser(prisma, centerId, { email: 'cliente@bloom.test', role: 'CLIENT' }))
      .id;
    otherClientId = (
      await createUser(prisma, centerId, { email: 'otro@bloom.test', role: 'CLIENT' })
    ).id;
    token = (await login(app, 'coach@bloom.test')).accessToken;

    const exercise = await prisma.exercise.create({
      data: {
        centerId,
        name: 'Sentadilla',
        primaryMuscle: 'QUADRICEPS',
        equipment: 'BARBELL',
        difficulty: 'BEGINNER',
      },
    });
    const template = (name: string, count: number) =>
      prisma.workoutTemplate.create({
        data: {
          centerId,
          name,
          items: {
            create: Array.from({ length: count }, (_, position) => ({
              exerciseId: exercise.id,
              position,
              sets: 3,
              reps: '10',
              restSeconds: 60,
            })),
          },
        },
      });
    templates = {
      a: (await template('Día A', 2)).id,
      b: (await template('Día B', 3)).id,
      c: (await template('Día C', 1)).id,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const as = () => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const routine = (overrides: Record<string, unknown> = {}) => ({
    name: 'Fuerza · bloque 1',
    goal: 'Ganar fuerza en los básicos',
    startsOn: '2026-12-01',
    endsOn: '2027-01-31',
    templateIds: [templates.a, templates.b, templates.c],
    ...overrides,
  });
  const create = async (body = routine(), client = clientId) => {
    const res = await http().post(`/clients/${client}/routines`).set(as()).send(body).expect(201);
    return routineSchema.parse(res.body);
  };
  const list = async (client = clientId) =>
    routineListSchema.parse(
      (await http().get(`/clients/${client}/routines`).set(as()).expect(200)).body,
    ).items;

  it('AC-003-12: asigna a un cliente una rutina con fechas y plantillas ordenadas', async () => {
    const created = await create();

    expect(created).toMatchObject({
      clientId,
      name: 'Fuerza · bloque 1',
      goal: 'Ganar fuerza en los básicos',
      startsOn: '2026-12-01',
      endsOn: '2027-01-31',
      isActive: true,
    });
    expect(created.templates).toEqual([
      { position: 0, id: templates.a, name: 'Día A', exerciseCount: 2 },
      { position: 1, id: templates.b, name: 'Día B', exerciseCount: 3 },
      { position: 2, id: templates.c, name: 'Día C', exerciseCount: 1 },
    ]);
  });

  it('AC-003-12: la fecha de fin es opcional y una plantilla puede repetirse', async () => {
    const created = await create(
      routine({ endsOn: null, templateIds: [templates.a, templates.b, templates.a] }),
    );
    expect(created.endsOn).toBeNull();
    expect(created.templates.map((t) => t.name)).toEqual(['Día A', 'Día B', 'Día A']);
  });

  it('valida las fechas (400) y que las plantillas existan (422)', async () => {
    const res = await http()
      .post(`/clients/${clientId}/routines`)
      .set(as())
      .send(routine({ startsOn: '2026-12-10', endsOn: '2026-12-01' }))
      .expect(400);
    expect(res.body.details[0]).toEqual({
      path: 'endsOn',
      message: 'La fecha de fin no puede ser anterior a la de inicio.',
    });

    await http()
      .post(`/clients/${clientId}/routines`)
      .set(as())
      .send(routine({ templateIds: ['0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60'] }))
      .expect(422);
  });

  it('solo se asignan rutinas a clientes (422)', async () => {
    const res = await http()
      .post(`/clients/${trainerId}/routines`)
      .set(as())
      .send(routine())
      .expect(422);
    expect(res.body.message).toBe('Las rutinas solo se asignan a clientes.');
  });

  it('AC-003-13: al activar una rutina, la anterior activa del mismo cliente pasa a inactiva', async () => {
    const first = await create(routine({ name: 'Bloque 1' }));
    const second = await create(routine({ name: 'Bloque 2' }));
    const otherClient = await create(routine({ name: 'De otro cliente' }), otherClientId);

    let routines = await list();
    expect(routines.map((r) => [r.name, r.isActive])).toEqual([
      ['Bloque 2', true],
      ['Bloque 1', false],
    ]);

    await http().post(`/routines/${first.id}/activate`).set(as()).expect(200);
    routines = await list();
    expect(routines.find((r) => r.id === first.id)?.isActive).toBe(true);
    expect(routines.find((r) => r.id === second.id)?.isActive).toBe(false);
    // La rutina de otro cliente no se ve afectada.
    expect((await list(otherClientId))[0]?.id).toBe(otherClient.id);
    expect((await list(otherClientId))[0]?.isActive).toBe(true);
  });

  it('AC-003-13: se puede crear una rutina sin activarla y desactivar la activa', async () => {
    const active = await create(routine({ name: 'Activa' }));
    const draft = await create(routine({ name: 'Borrador', activate: false }));
    expect(draft.isActive).toBe(false);
    expect((await list()).find((r) => r.id === active.id)?.isActive).toBe(true);

    await http().post(`/routines/${active.id}/deactivate`).set(as()).expect(200);
    expect((await list()).every((r) => !r.isActive)).toBe(true);
  });

  it('edita la rutina y su secuencia de plantillas', async () => {
    const created = await create();
    const res = await http()
      .put(`/routines/${created.id}`)
      .set(as())
      .send(routine({ name: 'Bloque 1 (ajustado)', templateIds: [templates.c, templates.a] }))
      .expect(200);
    const updated = routineSchema.parse(res.body);
    expect(updated.name).toBe('Bloque 1 (ajustado)');
    expect(updated.templates.map((t) => t.id)).toEqual([templates.c, templates.a]);
    expect(updated.isActive).toBe(true);
  });

  it('un cliente no puede ver rutinas, ni las suyas, por esta API (403)', async () => {
    const created = await create();
    const clientToken = (await login(app, 'cliente@bloom.test')).accessToken;
    await http()
      .get(`/routines/${created.id}`)
      .set({ Authorization: `Bearer ${clientToken}` })
      .expect(403);
  });

  it('no se ven rutinas ni clientes de otro centro (404)', async () => {
    const created = await create();
    const other = await createCenter(prisma, 'Otro centro');
    await createUser(prisma, other.id, { email: 'coach2@bloom.test', role: 'TRAINER' });
    const otherToken = (await login(app, 'coach2@bloom.test')).accessToken;
    const auth = { Authorization: `Bearer ${otherToken}` };
    await http().get(`/routines/${created.id}`).set(auth).expect(404);
    await http().get(`/clients/${clientId}/routines`).set(auth).expect(404);
  });
});
