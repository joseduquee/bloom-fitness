import type { INestApplication } from '@nestjs/common';
import { sessionListSchema, trainingSessionSchema } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createCenter, createTestApp, createUser, login, resetDatabase } from './utils';

describe('Planificación de sesiones (spec 004, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let centerId: string;
  let ids: { admin: string; coach: string; coach2: string; clients: string[]; inactive: string };
  let tokens: { admin: string; coach: string; coach2: string; client: string };

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    centerId = (await createCenter(prisma)).id;
    const user = (email: string, role: 'ADMIN' | 'TRAINER' | 'CLIENT', isActive = true) =>
      createUser(prisma, centerId, { email, role, isActive });
    ids = {
      admin: (await user('admin@bloom.test', 'ADMIN')).id,
      coach: (await user('coach@bloom.test', 'TRAINER')).id,
      coach2: (await user('coach2@bloom.test', 'TRAINER')).id,
      clients: [
        (await user('ana@bloom.test', 'CLIENT')).id,
        (await user('bea@bloom.test', 'CLIENT')).id,
        (await user('carlos@bloom.test', 'CLIENT')).id,
        (await user('dani@bloom.test', 'CLIENT')).id,
        (await user('eva@bloom.test', 'CLIENT')).id,
      ],
      inactive: (await user('baja@bloom.test', 'CLIENT', false)).id,
    };
    tokens = {
      admin: (await login(app, 'admin@bloom.test')).accessToken,
      coach: (await login(app, 'coach@bloom.test')).accessToken,
      coach2: (await login(app, 'coach2@bloom.test')).accessToken,
      client: (await login(app, 'ana@bloom.test')).accessToken,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const client = (index: number) => ids.clients[index] as string;
  const session = (overrides: Record<string, unknown> = {}) => ({
    startsAt: '2026-12-01T09:00:00.000Z',
    endsAt: '2026-12-01T10:00:00.000Z',
    clientIds: [client(0), client(1)],
    ...overrides,
  });
  const create = async (body = session(), token = tokens.coach) => {
    const res = await http().post('/sessions').set(as(token)).send(body).expect(201);
    return trainingSessionSchema.parse(res.body);
  };

  it('AC-004-01: el entrenador programa una sesión para sí mismo con sus asistentes', async () => {
    const created = await create(session({ notes: 'Traer toalla' }));

    expect(created).toMatchObject({
      trainer: { id: ids.coach },
      startsAt: '2026-12-01T09:00:00.000Z',
      endsAt: '2026-12-01T10:00:00.000Z',
      status: 'SCHEDULED',
      notes: 'Traer toalla',
    });
    expect(created.attendees.map((a) => a.id).sort()).toEqual([client(0), client(1)].sort());
  });

  it('AC-004-01: el administrador asigna la sesión a otro entrenador; un entrenador no puede (403)', async () => {
    const created = await create(session({ trainerId: ids.coach2 }), tokens.admin);
    expect(created.trainer.id).toBe(ids.coach2);

    await http()
      .post('/sessions')
      .set(as(tokens.coach))
      .send(
        session({
          trainerId: ids.coach2,
          startsAt: '2026-12-02T09:00:00Z',
          endsAt: '2026-12-02T10:00:00Z',
        }),
      )
      .expect(403);
  });

  it('AC-004-01: admite hasta 4 asistentes (422 si se supera)', async () => {
    await create(session({ clientIds: ids.clients.slice(0, 4) }));
    const res = await http()
      .post('/sessions')
      .set(as(tokens.coach))
      .send(
        session({
          clientIds: ids.clients,
          startsAt: '2026-12-01T11:00:00Z',
          endsAt: '2026-12-01T12:00:00Z',
        }),
      )
      .expect(422);
    expect(res.body.message).toBe('La sesión admite como máximo 4 asistentes.');
  });

  it('AC-004-01: los asistentes deben ser clientes activos y el entrenador, válido (422)', async () => {
    await http()
      .post('/sessions')
      .set(as(tokens.coach))
      .send(session({ clientIds: [ids.inactive] }))
      .expect(422);
    await http()
      .post('/sessions')
      .set(as(tokens.coach))
      .send(session({ clientIds: [ids.coach2] }))
      .expect(422);
    await http()
      .post('/sessions')
      .set(as(tokens.admin))
      .send(session({ trainerId: client(0) }))
      .expect(422);
  });

  it('AC-004-02: un cliente no puede estar en dos sesiones que se solapan (409)', async () => {
    await create();
    const res = await http()
      .post('/sessions')
      .set(as(tokens.coach2))
      .send(
        session({
          startsAt: '2026-12-01T09:30:00.000Z',
          endsAt: '2026-12-01T10:30:00.000Z',
          clientIds: [client(1), client(2)],
        }),
      )
      .expect(409);
    expect(res.body.message).toBe('Nombre bea ya tiene otra sesión en ese horario.');
  });

  it('AC-004-02: una sesión que empieza cuando acaba otra no se solapa, ni una cancelada', async () => {
    const first = await create();
    await create(
      session({ startsAt: '2026-12-01T10:00:00.000Z', endsAt: '2026-12-01T11:00:00.000Z' }),
    );

    await http().post(`/sessions/${first.id}/cancel`).set(as(tokens.coach)).expect(200);
    await create(
      session({ startsAt: '2026-12-01T09:15:00.000Z', endsAt: '2026-12-01T09:45:00.000Z' }),
    );
  });

  it('AC-004-02: al editar, la propia sesión no cuenta como solapamiento', async () => {
    const created = await create();
    const res = await http()
      .put(`/sessions/${created.id}`)
      .set(as(tokens.coach))
      .send(
        session({
          endsAt: '2026-12-01T10:30:00.000Z',
          clientIds: [client(0), client(1), client(2)],
        }),
      )
      .expect(200);
    expect(trainingSessionSchema.parse(res.body).attendees).toHaveLength(3);
  });

  it('AC-004-03: la agenda devuelve las sesiones del intervalo en orden y la capacidad', async () => {
    await create(session({ startsAt: '2026-12-03T17:00:00Z', endsAt: '2026-12-03T18:00:00Z' }));
    await create(session({ startsAt: '2026-12-01T09:00:00Z', endsAt: '2026-12-01T10:00:00Z' }));
    await create(session({ startsAt: '2026-12-08T09:00:00Z', endsAt: '2026-12-08T10:00:00Z' }));

    const res = await http()
      .get('/sessions?from=2026-11-30T23:00:00.000Z&to=2026-12-07T23:00:00.000Z')
      .set(as(tokens.coach2))
      .expect(200);
    const list = sessionListSchema.parse(res.body);
    expect(list.maxAttendees).toBe(4);
    expect(list.items.map((s) => s.startsAt)).toEqual([
      '2026-12-01T09:00:00.000Z',
      '2026-12-03T17:00:00.000Z',
    ]);
    await http()
      .get('/sessions?from=2026-12-01T00:00:00Z&to=2027-02-01T00:00:00Z')
      .set(as(tokens.coach))
      .expect(400);
  });

  it('AC-004-09: solo el entrenador asignado o un administrador modifica o cancela (403)', async () => {
    const created = await create();
    await http().put(`/sessions/${created.id}`).set(as(tokens.coach2)).send(session()).expect(403);
    await http().post(`/sessions/${created.id}/cancel`).set(as(tokens.coach2)).expect(403);

    const res = await http()
      .put(`/sessions/${created.id}`)
      .set(as(tokens.admin))
      .send(session({ trainerId: ids.coach2 }))
      .expect(200);
    expect(trainingSessionSchema.parse(res.body).trainer.id).toBe(ids.coach2);
  });

  it('una sesión cancelada ya no se puede editar (409) y un cliente no ve la agenda (403)', async () => {
    const created = await create();
    await http().post(`/sessions/${created.id}/cancel`).set(as(tokens.coach)).expect(200);
    await http().put(`/sessions/${created.id}`).set(as(tokens.coach)).send(session()).expect(409);
    await http()
      .get('/sessions?from=2026-12-01T00:00:00Z&to=2026-12-02T00:00:00Z')
      .set(as(tokens.client))
      .expect(403);
  });

  it('no se ven sesiones de otro centro (404)', async () => {
    const created = await create();
    const other = await createCenter(prisma, 'Otro centro');
    await createUser(prisma, other.id, { email: 'fuera@bloom.test', role: 'TRAINER' });
    const token = (await login(app, 'fuera@bloom.test')).accessToken;
    await http().get(`/sessions/${created.id}`).set(as(token)).expect(404);
  });
});
