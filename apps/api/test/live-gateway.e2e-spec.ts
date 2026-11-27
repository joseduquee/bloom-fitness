import type { INestApplication } from '@nestjs/common';
import {
  LIVE_NAMESPACE,
  LiveEvents,
  liveSessionSchema,
  screenSessionSchema,
  type LiveSession,
  type ScreenSession,
  type SubscribeAck,
} from '@bloom/shared';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createCenter, createTestApp, createUser, login, resetDatabase } from './utils';

describe('Canal en tiempo real (spec 004, PR C, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let url: string;
  let sessionId: string;
  let ana: string;
  let tokens: { coach: string; client: string; other: string };
  const sockets: Socket[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    url = `http://127.0.0.1:${port}${LIVE_NAMESPACE}`;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const centerId = (await createCenter(prisma)).id;
    await createUser(prisma, centerId, { email: 'coach@bloom.test', role: 'TRAINER' });
    ana = (
      await createUser(prisma, centerId, {
        email: 'ana@bloom.test',
        role: 'CLIENT',
        alias: 'Anita',
      })
    ).id;
    const other = await createCenter(prisma, 'Otro centro');
    await createUser(prisma, other.id, { email: 'fuera@bloom.test', role: 'TRAINER' });
    tokens = {
      coach: (await login(app, 'coach@bloom.test')).accessToken,
      client: (await login(app, 'ana@bloom.test')).accessToken,
      other: (await login(app, 'fuera@bloom.test')).accessToken,
    };

    const exercise = await prisma.exercise.create({
      data: {
        centerId,
        name: 'Sentadilla',
        primaryMuscle: 'QUADRICEPS',
        equipment: 'BARBELL',
        difficulty: 'BEGINNER',
      },
    });
    const template = await prisma.workoutTemplate.create({
      data: {
        centerId,
        name: 'Día A',
        items: {
          create: [{ exerciseId: exercise.id, position: 0, sets: 3, reps: '8', restSeconds: 90 }],
        },
      },
    });
    const created = await request(app.getHttpServer())
      .post('/sessions')
      .set({ Authorization: `Bearer ${tokens.coach}` })
      .send({ startsAt: '2026-12-01T09:00:00Z', endsAt: '2026-12-01T10:00:00Z', clientIds: [ana] })
      .expect(201);
    sessionId = (created.body as { id: string }).id;
    await request(app.getHttpServer())
      .post(`/sessions/${sessionId}/start`)
      .set({ Authorization: `Bearer ${tokens.coach}` })
      .send({ assignments: [{ clientId: ana, templateId: template.id }] })
      .expect(200);
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await app.close();
  });

  const connect = (token?: string) => {
    const socket = io(url, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  };
  const connected = (socket: Socket) =>
    new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });
  const rejected = (socket: Socket) =>
    new Promise<string>((resolve, reject) => {
      socket.once('connect', () => reject(new Error('Se ha conectado y no debía')));
      socket.once('connect_error', (error) => resolve(error.message));
    });
  const once = <T>(socket: Socket, event: string, timeoutMs = 2000) =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Sin evento ${event}`)), timeoutMs);
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  const subscribe = (socket: Socket, event: string) =>
    socket.emitWithAck(event, { sessionId }) as Promise<SubscribeAck>;
  const logSet = () =>
    request(app.getHttpServer())
      .put(`/sessions/${sessionId}/attendees/${ana}/exercises/0/sets/1`)
      .set({ Authorization: `Bearer ${tokens.coach}` })
      .send({ weightKg: 60, reps: 8 })
      .expect(200);

  it('AC-004-16: rechaza la conexión sin token, con un token falso o de un cliente', async () => {
    expect(await rejected(connect())).toBe('No has iniciado sesión.');
    expect(await rejected(connect('no-es-un-jwt'))).toBe(
      'La sesión ha caducado. Vuelve a iniciar sesión.',
    );
    expect(await rejected(connect(tokens.client))).toBe(
      'No tienes acceso al canal en tiempo real.',
    );
  });

  it('AC-004-15: el panel recibe la instantánea y cada cambio en menos de 1 s', async () => {
    const socket = connect(tokens.coach);
    await connected(socket);
    const snapshot = once<LiveSession>(socket, LiveEvents.sessionSnapshot);
    expect(await subscribe(socket, LiveEvents.sessionSubscribe)).toEqual({ ok: true });
    const initial = liveSessionSchema.parse(await snapshot);

    const updated = once<LiveSession>(socket, LiveEvents.sessionUpdated);
    const started = performance.now();
    await logSet();
    const change = liveSessionSchema.parse(await updated);
    const elapsed = performance.now() - started;

    expect(change.revision).toBeGreaterThan(initial.revision);
    expect(change.attendees[0]?.exercises[0]?.logs).toHaveLength(1);
    expect(elapsed).toBeLessThan(1000);
  });

  it('AC-004-17: un usuario de otro centro no puede suscribirse ni recibe los cambios', async () => {
    const outsider = connect(tokens.other);
    await connected(outsider);
    expect(await subscribe(outsider, LiveEvents.sessionSubscribe)).toEqual({
      ok: false,
      error: 'Sesión no encontrada.',
    });
    expect(await subscribe(outsider, LiveEvents.screenSubscribe)).toMatchObject({ ok: false });

    let received = false;
    outsider.on(LiveEvents.sessionUpdated, () => (received = true));
    outsider.on(LiveEvents.screenSession, () => (received = true));
    await logSet();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received).toBe(false);
  });

  it('AC-004-18: la proyección para pantallas solo lleva el alias y el entrenamiento', async () => {
    const socket = connect(tokens.coach);
    await connected(socket);
    const first = once<ScreenSession>(socket, LiveEvents.screenSession);
    expect(await subscribe(socket, LiveEvents.screenSubscribe)).toEqual({ ok: true });
    expect(screenSessionSchema.parse(await first).attendees[0]?.displayName).toBe('Anita');

    const next = once<ScreenSession>(socket, LiveEvents.screenSession);
    await logSet();
    const screen = await next;
    expect(screen.attendees[0]?.current).toMatchObject({ name: 'Sentadilla', setsDone: 1 });
    const json = JSON.stringify(screen);
    expect(json).not.toContain('ana@bloom.test');
    expect(json).not.toContain(ana);
    expect(json).not.toContain('lastName');
  });

  it('valida la petición de suscripción', async () => {
    const socket = connect(tokens.coach);
    await connected(socket);
    const ack = (await socket.emitWithAck(LiveEvents.sessionSubscribe, {
      sessionId: 'x',
    })) as SubscribeAck;
    expect(ack).toEqual({ ok: false, error: 'Petición no válida.' });
  });
});
