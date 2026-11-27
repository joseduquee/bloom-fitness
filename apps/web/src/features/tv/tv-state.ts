import type { ScreenSession, ScreenState } from '@bloom/shared';

export type TvConnection = 'connecting' | 'live' | 'reconnecting' | 'unauthorized';

export interface TvState {
  connection: TvConnection;
  center: ScreenState['center'] | null;
  screenName: string | null;
  /** Sesiones en curso por id. */
  sessions: Record<string, ScreenSession>;
}

export type TvEvent =
  | { type: 'state'; state: ScreenState }
  | { type: 'session'; session: ScreenSession }
  | { type: 'connection'; connection: TvConnection };

export const initialTvState: TvState = {
  connection: 'connecting',
  center: null,
  screenName: null,
  sessions: {},
};

/** Estado de la pantalla a partir de los eventos del canal en tiempo real. */
export function tvReducer(state: TvState, event: TvEvent): TvState {
  switch (event.type) {
    case 'state':
      return {
        connection: 'live',
        center: event.state.center,
        screenName: event.state.screen.name,
        sessions: Object.fromEntries(
          event.state.sessions
            .filter((session) => session.status === 'IN_PROGRESS')
            .map((session) => [session.id, session]),
        ),
      };
    case 'session': {
      const current = state.sessions[event.session.id];
      // Un evento atrasado no deshace uno más reciente.
      if (current && event.session.revision < current.revision) return state;
      const sessions = { ...state.sessions };
      if (event.session.status === 'IN_PROGRESS') sessions[event.session.id] = event.session;
      else delete sessions[event.session.id];
      return { ...state, sessions };
    }
    case 'connection':
      return { ...state, connection: event.connection };
  }
}

/** Asistentes presentes de todas las sesiones en curso, en orden de pantalla (AC-005-06). */
export function presentAttendees(state: TvState) {
  return Object.values(state.sessions).flatMap((session) =>
    session.attendees
      .filter((attendee) => !attendee.absent)
      .map((attendee) => ({ ...attendee, key: `${session.id}-${attendee.slot}` })),
  );
}
