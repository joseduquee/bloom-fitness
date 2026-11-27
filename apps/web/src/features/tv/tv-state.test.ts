import type { ScreenSession } from '@bloom/shared';
import { describe, expect, it } from 'vitest';
import { initialTvState, presentAttendees, tvReducer } from './tv-state';

const attendee = (slot: number, absent = false) => ({
  slot,
  displayName: `Cliente ${slot}`,
  absent,
  day: 'A',
  templateName: 'Día A',
  progress: ['PENDING' as const],
  current: null,
});
const session = (
  id: string,
  revision: number,
  overrides: Partial<ScreenSession> = {},
): ScreenSession => ({
  id,
  status: 'IN_PROGRESS',
  revision,
  attendees: [attendee(1), attendee(2, true)],
  ...overrides,
});
const ID = '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60';
const state = tvReducer(initialTvState, {
  type: 'state',
  state: {
    screen: { id: '11111111-1111-4111-8111-111111111111', name: 'Tele' },
    center: { name: 'Bloom Centro', timezone: 'Europe/Madrid' },
    sessions: [session(ID, 3)],
  },
});

describe('estado de la pantalla', () => {
  it('AC-005-06: muestra solo los asistentes presentes de las sesiones en curso', () => {
    expect(state.connection).toBe('live');
    expect(presentAttendees(state).map((a) => a.displayName)).toEqual(['Cliente 1']);
  });

  it('aplica los cambios, ignora los atrasados y quita la sesión al finalizar', () => {
    const newer = tvReducer(state, {
      type: 'session',
      session: session(ID, 5, { attendees: [attendee(1), attendee(2)] }),
    });
    expect(presentAttendees(newer)).toHaveLength(2);

    const stale = tvReducer(newer, { type: 'session', session: session(ID, 4) });
    expect(stale).toBe(newer);

    const finished = tvReducer(newer, {
      type: 'session',
      session: session(ID, 6, { status: 'FINISHED' }),
    });
    expect(presentAttendees(finished)).toEqual([]);
  });

  it('AC-005-09: recuerda el estado de la conexión sin perder los datos', () => {
    const reconnecting = tvReducer(state, { type: 'connection', connection: 'reconnecting' });
    expect(reconnecting.connection).toBe('reconnecting');
    expect(presentAttendees(reconnecting)).toHaveLength(1);
  });
});
