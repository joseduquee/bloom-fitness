import type { INestApplication } from '@nestjs/common';
import { liveSessionSchema, startPlanSchema, type LiveSession } from '@bloom/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createCenter, createTestApp, createUser, login, resetDatabase } from './utils';

describe('Dirigir una sesión (spec 004, integración)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let centerId: string;
  let ana: string;
  let bea: string;
  let ex: { squat: string; bench: string; row: string; old: string };
  let tpl: { a: string; b: string };
  let tokens: { coach: string; coach2: string; admin: string };
  let day = 0;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    day = 0;
    await resetDatabase(prisma);
    centerId = (await createCenter(prisma)).id;
    await createUser(prisma, centerId, { email: 'coach@bloom.test', role: 'TRAINER' });
    await createUser(prisma, centerId, { email: 'coach2@bloom.test', role: 'TRAINER' });
    await createUser(prisma, centerId, { email: 'admin@bloom.test', role: 'ADMIN' });
    ana = (await createUser(prisma, centerId, { email: 'ana@bloom.test', role: 'CLIENT' })).id;
    bea = (await createUser(prisma, centerId, { email: 'bea@bloom.test', role: 'CLIENT' })).id;
    tokens = {
      coach: (await login(app, 'coach@bloom.test')).accessToken,
      coach2: (await login(app, 'coach2@bloom.test')).accessToken,
      admin: (await login(app, 'admin@bloom.test')).accessToken,
    };

    const exercise = async (name: string, isActive = true) =>
      (
        await prisma.exercise.create({
          data: {
            centerId,
            name,
            primaryMuscle: 'CORE',
            equipment: 'OTHER',
            difficulty: 'BEGINNER',
            isActive,
          },
        })
      ).id;
    ex = {
      squat: await exercise('Sentadilla'),
      bench: await exercise('Press de banca'),
      row: await exercise('Remo'),
      old: await exercise('Retirado', false),
    };
    const template = async (
      name: string,
      items: { exerciseId: string; sets: number; load?: number }[],
    ) =>
      (
        await prisma.workoutTemplate.create({
          data: {
            centerId,
            name,
            items: {
              create: items.map((item, position) => ({
                exerciseId: item.exerciseId,
                position,
                sets: item.sets,
                reps: '8-10',
                targetLoadKg: item.load ?? null,
                restSeconds: 90,
              })),
            },
          },
        })
      ).id;
    tpl = {
      a: await template('Día A', [
        { exerciseId: ex.squat, sets: 3, load: 60 },
        { exerciseId: ex.bench, sets: 2 },
      ]),
      b: await template('Día B', [{ exerciseId: ex.row, sets: 2, load: 40 }]),
    };
    await prisma.routine.create({
      data: {
        centerId,
        clientId: ana,
        name: 'Fuerza',
        startsOn: new Date('2026-12-01T00:00:00Z'),
        isActive: true,
        templates: {
          create: [
            { templateId: tpl.a, position: 0 },
            { templateId: tpl.b, position: 1 },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());
  const parse = (body: unknown): LiveSession => liveSessionSchema.parse(body);
  const attendee = (session: LiveSession, clientId: string) => {
    const found = session.attendees.find((a) => a.client.id === clientId);
    if (!found) throw new Error('asistente no encontrado');
    return found;
  };

  /** Programa una sesión en un día distinto cada vez para no solaparse. */
  const schedule = async (clients = [ana, bea]) => {
    day += 1;
    const start = new Date(Date.UTC(2026, 11, day, 9));
    const res = await http()
      .post('/sessions')
      .set(as(tokens.coach))
      .send({
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
        clientIds: clients,
      })
      .expect(201);
    return (res.body as { id: string }).id;
  };
  const start = async (id: string, assignments: unknown[] = [], token = tokens.coach) =>
    parse(
      (await http().post(`/sessions/${id}/start`).set(as(token)).send({ assignments }).expect(200))
        .body,
    );
  const action = (id: string, path: string) => `/sessions/${id}/attendees/${path}`;
  const logSet = (
    id: string,
    clientId: string,
    position: number,
    set: number,
    body: object,
    token = tokens.coach,
  ) =>
    http()
      .put(action(id, `${clientId}/exercises/${position}/sets/${set}`))
      .set(as(token))
      .send(body);
  const navigate = async (id: string, clientId: string, actionName: string) =>
    parse(
      (
        await http()
          .post(action(id, `${clientId}/navigate`))
          .set(as(tokens.coach))
          .send({ action: actionName })
          .expect(200)
      ).body,
    );
  const finish = async (id: string) =>
    parse((await http().post(`/sessions/${id}/finish`).set(as(tokens.coach)).expect(200)).body);

  it('AC-004-04 y AC-003-14: propone la plantilla que toca según la última sesión del cliente', async () => {
    const first = await schedule();
    const plan = startPlanSchema.parse(
      (await http().get(`/sessions/${first}/start-plan`).set(as(tokens.coach)).expect(200)).body,
    );
    expect(plan.attendees.find((a) => a.client.id === ana)).toMatchObject({
      routine: { name: 'Fuerza' },
      proposedTemplateId: tpl.a,
      proposedPosition: 0,
    });
    expect(plan.attendees.find((a) => a.client.id === bea)).toMatchObject({
      routine: null,
      proposedTemplateId: null,
    });

    const started = await start(first);
    expect(attendee(started, ana)).toMatchObject({
      routine: { name: 'Fuerza', day: 'A' },
      template: { name: 'Día A' },
    });
    expect(attendee(started, bea).exercises).toEqual([]);
    await finish(first);

    // La siguiente sesión toca el día B y la de después vuelve al A.
    const second = await schedule();
    expect(attendee(await start(second), ana).routine?.day).toBe('B');
    await finish(second);
    const third = await schedule();
    expect(attendee(await start(third), ana).template?.id).toBe(tpl.a);
  });

  it('AC-004-04: se puede elegir otra plantilla al iniciar o cambiarla durante la sesión', async () => {
    const id = await schedule();
    const started = await start(id, [
      { clientId: ana, templateId: tpl.b },
      { clientId: bea, templateId: tpl.a },
    ]);
    expect(attendee(started, ana)).toMatchObject({
      template: { id: tpl.b },
      routine: { day: 'B' },
    });
    expect(attendee(started, bea)).toMatchObject({ template: { id: tpl.a }, routine: null });

    const changed = parse(
      (
        await http()
          .put(action(id, `${bea}/template`))
          .set(as(tokens.coach))
          .send({ templateId: tpl.b })
          .expect(200)
      ).body,
    );
    expect(attendee(changed, bea).exercises.map((e) => e.exercise.name)).toEqual(['Remo']);

    await logSet(id, bea, 0, 1, { weightKg: 40, reps: 10 }).expect(200);
    await http()
      .put(action(id, `${bea}/template`))
      .set(as(tokens.coach))
      .send({ templateId: tpl.a })
      .expect(409);
  });

  it('AC-004-05 y AC-003-11: la sesión trabaja con una copia y editar la plantilla no la altera', async () => {
    const id = await schedule();
    await start(id);
    await http()
      .put(`/templates/${tpl.a}`)
      .set(as(tokens.coach))
      .send({
        name: 'Día A cambiado',
        items: [{ exerciseId: ex.row, sets: 5, reps: '5', restSeconds: 60 }],
      })
      .expect(200);

    const snapshot = parse(
      (await http().get(`/sessions/${id}/live`).set(as(tokens.coach)).expect(200)).body,
    );
    expect(attendee(snapshot, ana).template?.name).toBe('Día A');
    expect(
      attendee(snapshot, ana).exercises.map((e) => [e.exercise.name, e.sets, e.targetLoadKg]),
    ).toEqual([
      ['Sentadilla', 3, 60],
      ['Press de banca', 2, null],
    ]);
  });

  it('AC-004-06: un asistente ausente no registra series', async () => {
    const id = await schedule();
    await start(id);
    const res = await http()
      .put(action(id, `${ana}/attendance`))
      .set(as(tokens.coach))
      .send({ attendance: 'ABSENT' })
      .expect(200);
    expect(attendee(parse(res.body), ana).attendance).toBe('ABSENT');
    const blocked = await logSet(id, ana, 0, 1, { weightKg: 60, reps: 8 }).expect(409);
    expect(blocked.body.message).toBe('El asistente está marcado como ausente.');
  });

  it('AC-004-07: avanza, vuelve y omite ejercicios; el omitido queda registrado', async () => {
    const id = await schedule();
    await start(id);

    let snapshot = await navigate(id, ana, 'skip');
    expect(attendee(snapshot, ana).currentIndex).toBe(1);
    expect(attendee(snapshot, ana).exercises[0]?.status).toBe('SKIPPED');

    snapshot = await navigate(id, ana, 'next');
    expect(attendee(snapshot, ana).currentIndex).toBe(1); // no pasa del último
    await navigate(id, ana, 'previous');
    snapshot = await navigate(id, ana, 'previous');
    expect(attendee(snapshot, ana).currentIndex).toBe(0); // ni baja del primero
    expect(attendee(snapshot, ana).exercises[0]?.status).toBe('SKIPPED');
  });

  it('AC-004-10 a AC-004-12: registra series y corregir una no la duplica', async () => {
    const id = await schedule();
    await start(id);

    await logSet(id, ana, 0, 1, { weightKg: 60, reps: 10, rpe: 7 }).expect(200);
    await logSet(id, ana, 0, 2, { weightKg: 62.5, reps: 8 }).expect(200);
    const corrected = parse(
      (await logSet(id, ana, 0, 1, { weightKg: 60, reps: 9, rpe: 8 }).expect(200)).body,
    );
    let squat = attendee(corrected, ana).exercises[0];
    expect(squat?.logs).toEqual([
      { setNumber: 1, weightKg: 60, reps: 9, rpe: 8 },
      { setNumber: 2, weightKg: 62.5, reps: 8, rpe: null },
    ]);
    expect(squat?.status).toBe('PENDING');
    expect(await prisma.setLog.count()).toBe(2);

    const done = parse((await logSet(id, ana, 0, 3, { weightKg: 62.5, reps: 8 }).expect(200)).body);
    squat = attendee(done, ana).exercises[0];
    expect(squat?.status).toBe('COMPLETED');

    await logSet(id, ana, 0, 4, { weightKg: 60, reps: 8 }).expect(422);
    await logSet(id, ana, 0, 1, { weightKg: 60.1, reps: 8 }).expect(400);
    await logSet(id, ana, 0, 1, { weightKg: 600, reps: 8 }).expect(400);
  });

  it('AC-004-14: cambia la carga o sustituye el ejercicio solo en esta sesión', async () => {
    const id = await schedule();
    await start(id);
    const patch = (position: number, body: object) =>
      http()
        .patch(action(id, `${ana}/exercises/${position}`))
        .set(as(tokens.coach))
        .send(body);

    let snapshot = parse((await patch(0, { targetLoadKg: 65 }).expect(200)).body);
    expect(attendee(snapshot, ana).exercises[0]?.targetLoadKg).toBe(65);

    snapshot = parse((await patch(1, { exerciseId: ex.row }).expect(200)).body);
    expect(attendee(snapshot, ana).exercises[1]).toMatchObject({
      exercise: { id: ex.row },
      originalExerciseId: ex.bench,
    });
    await patch(1, { exerciseId: ex.old }).expect(422);

    await logSet(id, ana, 0, 1, { weightKg: 65, reps: 8 }).expect(200);
    await patch(0, { exerciseId: ex.row }).expect(409);

    // La plantilla no ha cambiado.
    const items = await prisma.templateExercise.findMany({
      where: { templateId: tpl.a },
      orderBy: { position: 'asc' },
    });
    expect(items.map((item) => [item.exerciseId, item.targetLoadKg?.toNumber() ?? null])).toEqual([
      [ex.squat, 60],
      [ex.bench, null],
    ]);
  });

  it('AC-004-08: al finalizar la sesión se cierra y sus series se conservan', async () => {
    const id = await schedule();
    await start(id);
    await logSet(id, ana, 0, 1, { weightKg: 60, reps: 10 }).expect(200);

    const finished = await finish(id);
    expect(finished.status).toBe('FINISHED');
    expect(finished.finishedAt).not.toBeNull();
    expect(attendee(finished, ana).exercises[0]?.logs).toHaveLength(1);
    await logSet(id, ana, 0, 2, { weightKg: 60, reps: 10 }).expect(409);
    await http().post(`/sessions/${id}/finish`).set(as(tokens.coach)).expect(409);
  });

  it('AC-004-09: otro entrenador puede ver la sesión pero no dirigirla (403); un administrador sí', async () => {
    const id = await schedule();
    await http().post(`/sessions/${id}/start`).set(as(tokens.coach2)).send({}).expect(403);
    await start(id, [], tokens.admin);
    await http().get(`/sessions/${id}/live`).set(as(tokens.coach2)).expect(200);
    await logSet(id, ana, 0, 1, { weightKg: 60, reps: 10 }, tokens.coach2).expect(403);
    await logSet(id, ana, 0, 1, { weightKg: 60, reps: 10 }, tokens.admin).expect(200);
  });

  it('cada cambio aumenta la revisión de la sesión', async () => {
    const id = await schedule();
    const started = await start(id);
    const next = await navigate(id, ana, 'next');
    expect(next.revision).toBeGreaterThan(started.revision);
  });

  it('no se puede iniciar dos veces ni actuar antes de iniciar (409)', async () => {
    const id = await schedule();
    await logSet(id, ana, 0, 1, { weightKg: 60, reps: 10 }).expect(409);
    await start(id);
    await http().post(`/sessions/${id}/start`).set(as(tokens.coach)).send({}).expect(409);
  });
});
