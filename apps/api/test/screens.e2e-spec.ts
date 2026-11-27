import type { INestApplication } from '@nestjs/common';
import {
  LIVE_NAMESPACE,
  LiveEvents,
  pairingCodeSchema,
  screenListSchema,
  screenStateSchema,
  type ScreenSession,
  type ScreenState,
} from '@bloom/shared';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LoginAttemptsService } from '../src/auth/login-attempts.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createCenter, createTestApp, createUser, login, resetDatabase } from './utils';

describe('Pantallas de sala (spec 005, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let url: string;
  let centerId: string;
  let tokens: { admin: string; coach: string; otherAdmin: string };
  const sockets: Socket[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    url = `http://127.0.0.1:${port}${LIVE_NAMESPACE}`;
  });

  beforeEach(async () => {
    app.get(LoginAttemptsService).clear();
    await resetDatabase(prisma);
    centerId = (await createCenter(prisma, 'Bloom Centro')).id;
    await createUser(prisma, centerId, { email: 'admin@bloom.test', role: 'ADMIN' });
    await createUser(prisma, centerId, { email: 'coach@bloom.test', role: 'TRAINER' });
    const other = await createCenter(prisma, 'Otro centro');
    await createUser(prisma, other.id, { email: 'admin2@bloom.test', role: 'ADMIN' });
    tokens = {
      admin: (await login(app, 'admin@bloom.test')).accessToken,
      coach: (await login(app, 'coach@bloom.test')).accessToken,
      otherAdmin: (await login(app, 'admin2@bloom.test')).accessToken,
    };
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const createScreen = async (name = 'Tele de la sala', token = tokens.admin) =>
    pairingCodeSchema.parse(
      (await http().post('/screens').set(as(token)).send({ name }).expect(201)).body,
    );
  const pair = (code: string) => http().post('/screens/pair').send({ code });
  const connectScreen = (screenToken: string) => {
    const socket = io(url, {
      auth: { screenToken },
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  };
  const once = <T>(socket: Socket, event: string, timeoutMs = 2000) =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Sin evento ${event}`)), timeoutMs);
      socket.once(event, (payload: T) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });

  it('AC-005-01: el administrador da de alta una pantalla y recibe un código de 6 caracteres para 10 minutos', async () => {
    const before = Date.now();
    const created = await createScreen();
    expect(created.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(created.screen).toMatchObject({ name: 'Tele de la sala', status: 'PENDING' });
    const minutes = (Date.parse(created.expiresAt) - before) / 60_000;
    expect(minutes).toBeGreaterThanOrEqual(10);
    expect(minutes).toBeLessThan(10.1);
    // El código no se guarda en claro.
    expect(JSON.stringify(await prisma.screenPairingCode.findMany())).not.toContain(created.code);
  });

  it('solo un administrador gestiona pantallas (403)', async () => {
    await http().get('/screens').set(as(tokens.coach)).expect(403);
    await http().post('/screens').set(as(tokens.coach)).send({ name: 'Tele' }).expect(403);
  });

  it('AC-005-02: el televisor canjea el código por un token de dispositivo', async () => {
    const created = await createScreen();
    const res = await pair(created.code.toLowerCase()).expect(200);
    expect(res.body).toEqual({
      token: expect.any(String),
      screen: { id: created.screen.id, name: 'Tele de la sala' },
    });
    const list = screenListSchema.parse((await http().get('/screens').set(as(tokens.admin))).body);
    expect(list.items[0]).toMatchObject({ status: 'PAIRED', pairedAt: expect.any(String) });
  });

  it('AC-005-03: un código ya usado, caducado o anulado por uno nuevo se rechaza', async () => {
    const created = await createScreen();
    await pair(created.code).expect(200);
    const used = await pair(created.code).expect(400);
    expect(used.body.message).toContain('no es válido o ha caducado');

    const second = await createScreen('Tele 2');
    await prisma.screenPairingCode.updateMany({
      where: { screenId: second.screen.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await pair(second.code).expect(400);

    const third = await createScreen('Tele 3');
    const replacement = pairingCodeSchema.parse(
      (
        await http()
          .post(`/screens/${third.screen.id}/pairing-code`)
          .set(as(tokens.admin))
          .expect(201)
      ).body,
    );
    await pair(third.code).expect(400);
    await pair(replacement.code).expect(200);
  });

  it('bloquea la IP tras varios códigos incorrectos (429)', async () => {
    for (let i = 0; i < 5; i++) await pair('ZZZZZZ').expect(400);
    await pair('ZZZZZZ').expect(429);
  });

  it('AC-005-05 y AC-005-06: la pantalla conectada recibe el centro, las sesiones en curso y cada cambio', async () => {
    const created = await createScreen();
    const { token } = (await pair(created.code).expect(200)).body as { token: string };

    const socket = connectScreen(token);
    const state = screenStateSchema.parse(await once<ScreenState>(socket, LiveEvents.screenState));
    expect(state).toEqual({
      screen: { id: created.screen.id, name: 'Tele de la sala' },
      center: { name: 'Bloom Centro', timezone: 'Europe/Madrid' },
      sessions: [],
    });

    // Al iniciar una sesión, la pantalla la recibe sin suscribirse a nada.
    const ana = await createUser(prisma, centerId, {
      email: 'ana@bloom.test',
      role: 'CLIENT',
      alias: 'Anita',
    });
    const session = await http()
      .post('/sessions')
      .set(as(tokens.coach))
      .send({
        startsAt: '2026-12-01T09:00:00Z',
        endsAt: '2026-12-01T10:00:00Z',
        clientIds: [ana.id],
      })
      .expect(201);
    const sessionId = (session.body as { id: string }).id;
    const update = once<ScreenSession>(socket, LiveEvents.screenSession);
    await http().post(`/sessions/${sessionId}/start`).set(as(tokens.coach)).send({}).expect(200);
    expect(await update).toMatchObject({
      id: sessionId,
      status: 'IN_PROGRESS',
      attendees: [{ displayName: 'Anita' }],
    });

    // Una pantalla que conecta después la recibe en el estado inicial.
    const late = connectScreen(token);
    const lateState = await once<ScreenState>(late, LiveEvents.screenState);
    expect(lateState.sessions.map((s) => s.id)).toEqual([sessionId]);
  });

  it('una pantalla no puede suscribirse a sesiones concretas ni recibe las de otro centro', async () => {
    const created = await createScreen();
    const { token } = (await pair(created.code).expect(200)).body as { token: string };
    const socket = connectScreen(token);
    await once(socket, LiveEvents.screenState);
    const ack = await socket.emitWithAck(LiveEvents.sessionSubscribe, {
      sessionId: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
    });
    expect(ack).toEqual({ ok: false, error: 'No permitido.' });

    const foreign = await createScreen('Tele ajena', tokens.otherAdmin);
    await http().get('/screens').set(as(tokens.otherAdmin)).expect(200);
    await http()
      .post(`/screens/${created.screen.id}/revoke`)
      .set(as(tokens.otherAdmin))
      .expect(404);
    expect(foreign.screen.id).not.toBe(created.screen.id);
  });

  it('AC-005-04: al revocar la pantalla se cierra su conexión y su token deja de valer', async () => {
    const created = await createScreen();
    const { token } = (await pair(created.code).expect(200)).body as { token: string };
    const socket = connectScreen(token);
    await once(socket, LiveEvents.screenState);

    const closed = once<string>(socket, 'disconnect');
    await http().post(`/screens/${created.screen.id}/revoke`).set(as(tokens.admin)).expect(200);
    expect(await closed).toBe('io server disconnect');

    const again = connectScreen(token);
    const error = await once<Error>(again, 'connect_error');
    expect(error.message).toBe('Pantalla no autorizada. Vuelve a emparejarla.');

    // Con un código nuevo se vuelve a emparejar.
    const code = pairingCodeSchema.parse(
      (
        await http()
          .post(`/screens/${created.screen.id}/pairing-code`)
          .set(as(tokens.admin))
          .expect(201)
      ).body,
    );
    await pair(code.code).expect(200);
    const list = screenListSchema.parse((await http().get('/screens').set(as(tokens.admin))).body);
    expect(list.items[0]?.status).toBe('PAIRED');
  });
});
