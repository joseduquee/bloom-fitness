import type { LiveSession } from '@bloom/shared';
import { describe, expect, it } from 'vitest';
import { applyOptimistic } from './optimistic';

const clientId = '22222222-2222-4222-8222-222222222222';
const exercise = (position: number) => ({
  position,
  exercise: {
    id: `5555555${position}-5555-4555-8555-555555555555`,
    name: `Ejercicio ${position}`,
    primaryMuscle: 'CHEST' as const,
    equipment: 'BARBELL' as const,
    mediaUrl: null,
    isActive: true,
  },
  originalExerciseId: null,
  sets: 2,
  reps: '8',
  targetLoadKg: 50,
  restSeconds: 90,
  notes: null,
  status: 'PENDING' as const,
  logs: [] as LiveSession['attendees'][number]['exercises'][number]['logs'],
});
const session: LiveSession = {
  id: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
  status: 'IN_PROGRESS',
  startsAt: '2026-12-01T09:00:00.000Z',
  endsAt: '2026-12-01T10:00:00.000Z',
  startedAt: '2026-12-01T09:00:00.000Z',
  finishedAt: null,
  trainer: {
    id: '11111111-1111-4111-8111-111111111111',
    firstName: 'M',
    lastName: 'C',
    alias: null,
  },
  revision: 3,
  attendees: [
    {
      client: { id: clientId, firstName: 'Ana', lastName: 'Demo', alias: null },
      attendance: 'PRESENT',
      routine: null,
      template: { id: '44444444-4444-4444-8444-444444444444', name: 'Día A' },
      currentIndex: 0,
      exercises: [exercise(0), exercise(1)],
    },
  ],
};
const ana = (s: LiveSession) => s.attendees[0] as LiveSession['attendees'][number];

describe('actualización optimista (AC-004-19)', () => {
  it('muestra la serie al momento y marca el ejercicio como completado al llegar a todas', () => {
    let next = applyOptimistic(session, {
      type: 'logSet',
      clientId,
      position: 0,
      setNumber: 1,
      body: { weightKg: 50, reps: 8 },
    });
    expect(ana(next).exercises[0]?.logs).toEqual([
      { setNumber: 1, weightKg: 50, reps: 8, rpe: null },
    ]);
    expect(ana(next).exercises[0]?.status).toBe('PENDING');

    next = applyOptimistic(next, {
      type: 'logSet',
      clientId,
      position: 0,
      setNumber: 2,
      body: { weightKg: 52.5, reps: 7, rpe: 9 },
    });
    expect(ana(next).exercises[0]?.status).toBe('COMPLETED');
    // No modifica el original: se puede restaurar si falla.
    expect(ana(session).exercises[0]?.logs).toEqual([]);
  });

  it('corregir una serie la sustituye en lugar de duplicarla', () => {
    const once = applyOptimistic(session, {
      type: 'logSet',
      clientId,
      position: 0,
      setNumber: 1,
      body: { weightKg: 50, reps: 8 },
    });
    const corrected = applyOptimistic(once, {
      type: 'logSet',
      clientId,
      position: 0,
      setNumber: 1,
      body: { weightKg: 50, reps: 6 },
    });
    expect(ana(corrected).exercises[0]?.logs).toHaveLength(1);
    expect(ana(corrected).exercises[0]?.logs[0]?.reps).toBe(6);
  });

  it('avanza, omite y marca la asistencia al momento', () => {
    const skipped = applyOptimistic(session, { type: 'navigate', clientId, action: 'skip' });
    expect(ana(skipped).currentIndex).toBe(1);
    expect(ana(skipped).exercises[0]?.status).toBe('SKIPPED');
    expect(
      ana(applyOptimistic(skipped, { type: 'navigate', clientId, action: 'next' })).currentIndex,
    ).toBe(1);

    const absent = applyOptimistic(session, { type: 'attendance', clientId, attendance: 'ABSENT' });
    expect(ana(absent).attendance).toBe('ABSENT');
  });

  it('no anticipa acciones que dependen del servidor', () => {
    expect(applyOptimistic(session, { type: 'finish' })).toBe(session);
  });
});
