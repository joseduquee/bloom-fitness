import { z } from 'zod';
import { liveExerciseStatusSchema, type LiveSession } from './live';
import { sessionStatusSchema } from './sessions';

/** Spec 004 · PR C: contratos del canal en tiempo real (Socket.IO). */

/** Espacio de nombres del canal. */
export const LIVE_NAMESPACE = '/live';

/** Nombres de los eventos. Cliente → servidor: `*:subscribe`. Servidor → cliente: el resto. */
export const LiveEvents = {
  /** El panel se suscribe a una sesión; recibe `session:snapshot` y después `session:updated`. */
  sessionSubscribe: 'session:subscribe',
  sessionUnsubscribe: 'session:unsubscribe',
  sessionSnapshot: 'session:snapshot',
  sessionUpdated: 'session:updated',
  /** Proyección para las pantallas de sala, sin datos personales (AC-004-18). */
  screenSubscribe: 'screen:subscribe',
  screenSession: 'screen:session',
  /** Estado inicial de una pantalla emparejada al conectarse (spec 005). */
  screenState: 'screen:state',
} as const;

export const subscribeRequestSchema = z.object({ sessionId: z.uuid() });
export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

/** Respuesta a una suscripción (acuse de Socket.IO). */
export type SubscribeAck = { ok: true } | { ok: false; error: string };

/**
 * Lo que ve una pantalla de sala (AC-004-18): alias o nombre de pila y el entrenamiento.
 * Sin apellidos, correo, identificadores de usuario ni RPE.
 */
export const screenSessionSchema = z.object({
  id: z.uuid(),
  status: sessionStatusSchema,
  revision: z.number().int().nonnegative(),
  attendees: z.array(
    z.object({
      /** Posición en la pantalla (1–4). */
      slot: z.number().int().positive(),
      displayName: z.string(),
      absent: z.boolean(),
      day: z.string().nullable(),
      templateName: z.string().nullable(),
      progress: z.array(liveExerciseStatusSchema),
      current: z
        .object({
          index: z.number().int().nonnegative(),
          name: z.string(),
          mediaUrl: z.string().nullable(),
          sets: z.number().int(),
          reps: z.string(),
          targetLoadKg: z.number().nullable(),
          restSeconds: z.number().int(),
          notes: z.string().nullable(),
          setsDone: z.number().int().nonnegative(),
          lastSet: z.object({ weightKg: z.number(), reps: z.number().int() }).nullable(),
        })
        .nullable(),
    }),
  ),
});
export type ScreenSession = z.infer<typeof screenSessionSchema>;

/** Proyección de la instantánea del panel a lo que puede ver una pantalla (AC-004-18). */
export function toScreenSession(session: LiveSession): ScreenSession {
  return {
    id: session.id,
    status: session.status,
    revision: session.revision,
    attendees: session.attendees.map((attendee, index) => {
      const current = attendee.exercises[attendee.currentIndex];
      const lastLog = current?.logs.at(-1);
      return {
        slot: index + 1,
        displayName: attendee.client.alias ?? attendee.client.firstName,
        absent: attendee.attendance === 'ABSENT',
        day: attendee.routine?.day ?? null,
        templateName: attendee.template?.name ?? null,
        progress: attendee.exercises.map((exercise) => exercise.status),
        current: current
          ? {
              index: attendee.currentIndex,
              name: current.exercise.name,
              mediaUrl: current.exercise.mediaUrl,
              sets: current.sets,
              reps: current.reps,
              targetLoadKg: current.targetLoadKg,
              restSeconds: current.restSeconds,
              notes: current.notes,
              setsDone: current.logs.length,
              lastSet: lastLog ? { weightKg: lastLog.weightKg, reps: lastLog.reps } : null,
            }
          : null,
      };
    }),
  };
}
