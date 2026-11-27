import type { LiveSession } from '@bloom/shared';
import type { LiveAction } from './api';

/**
 * AC-004-19: aplica en la instantánea local el efecto previsible de una acción antes de que responda
 * el servidor. Si la petición falla se restaura la anterior; si va bien, manda la del servidor.
 * Las acciones con efectos que dependen del servidor (iniciar, cambiar plantilla, ajustar) no se anticipan.
 */
export function applyOptimistic(session: LiveSession, action: LiveAction): LiveSession {
  if (action.type !== 'logSet' && action.type !== 'navigate' && action.type !== 'attendance') {
    return session;
  }
  return {
    ...session,
    attendees: session.attendees.map((attendee) => {
      if (attendee.client.id !== action.clientId) return attendee;

      if (action.type === 'attendance') return { ...attendee, attendance: action.attendance };

      if (action.type === 'navigate') {
        const last = attendee.exercises.length - 1;
        const delta = action.action === 'previous' ? -1 : 1;
        return {
          ...attendee,
          currentIndex: Math.min(Math.max(attendee.currentIndex + delta, 0), last),
          exercises: attendee.exercises.map((exercise) =>
            action.action === 'skip' && exercise.position === attendee.currentIndex
              ? { ...exercise, status: 'SKIPPED' as const }
              : exercise,
          ),
        };
      }

      return {
        ...attendee,
        exercises: attendee.exercises.map((exercise) => {
          if (exercise.position !== action.position) return exercise;
          const log = {
            setNumber: action.setNumber,
            weightKg: action.body.weightKg,
            reps: action.body.reps,
            rpe: action.body.rpe ?? null,
          };
          const logs = [...exercise.logs.filter((l) => l.setNumber !== action.setNumber), log].sort(
            (a, b) => a.setNumber - b.setNumber,
          );
          return {
            ...exercise,
            logs,
            status: logs.length >= exercise.sets ? ('COMPLETED' as const) : ('PENDING' as const),
          };
        }),
      };
    }),
  };
}
