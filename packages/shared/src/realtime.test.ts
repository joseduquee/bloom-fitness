import { describe, expect, it } from 'vitest';
import type { LiveSession } from './live';
import { toScreenSession } from './realtime';

const session: LiveSession = {
  id: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
  status: 'IN_PROGRESS',
  startsAt: '2026-12-01T09:00:00.000Z',
  endsAt: '2026-12-01T10:00:00.000Z',
  startedAt: '2026-12-01T09:01:00.000Z',
  finishedAt: null,
  trainer: {
    id: '11111111-1111-4111-8111-111111111111',
    firstName: 'Marcos',
    lastName: 'Coach',
    alias: null,
  },
  revision: 7,
  attendees: [
    {
      client: {
        id: '22222222-2222-4222-8222-222222222222',
        firstName: 'Lucía',
        lastName: 'García Pérez',
        alias: 'Lu',
      },
      attendance: 'PRESENT',
      routine: { id: '33333333-3333-4333-8333-333333333333', name: 'Fuerza', day: 'B' },
      template: { id: '44444444-4444-4444-8444-444444444444', name: 'Día B · Empuje' },
      currentIndex: 0,
      exercises: [
        {
          position: 0,
          exercise: {
            id: '55555555-5555-4555-8555-555555555555',
            name: 'Press de banca',
            primaryMuscle: 'CHEST',
            equipment: 'BARBELL',
            mediaUrl: null,
            isActive: true,
          },
          originalExerciseId: null,
          sets: 4,
          reps: '6-8',
          targetLoadKg: 50,
          restSeconds: 150,
          notes: null,
          status: 'PENDING',
          logs: [{ setNumber: 1, weightKg: 50, reps: 8, rpe: 8 }],
        },
      ],
    },
    {
      client: {
        id: '66666666-6666-4666-8666-666666666666',
        firstName: 'Javier',
        lastName: 'Ruiz',
        alias: null,
      },
      attendance: 'ABSENT',
      routine: null,
      template: null,
      currentIndex: 0,
      exercises: [],
    },
  ],
};

describe('proyección para las pantallas', () => {
  it('AC-004-18: solo muestra el alias o el nombre y el entrenamiento', () => {
    const screen = toScreenSession(session);

    expect(screen.attendees[0]).toEqual({
      slot: 1,
      displayName: 'Lu',
      absent: false,
      day: 'B',
      templateName: 'Día B · Empuje',
      progress: ['PENDING'],
      current: {
        index: 0,
        name: 'Press de banca',
        mediaUrl: null,
        sets: 4,
        reps: '6-8',
        targetLoadKg: 50,
        restSeconds: 150,
        notes: null,
        setsDone: 1,
        lastSet: { weightKg: 50, reps: 8 },
      },
    });
    expect(screen.attendees[1]).toMatchObject({
      displayName: 'Javier',
      absent: true,
      current: null,
    });

    const json = JSON.stringify(screen);
    for (const secret of ['García Pérez', 'Ruiz', 'Marcos', '22222222', 'rpe']) {
      expect(json).not.toContain(secret);
    }
  });
});
