import { z } from 'zod';

/** Asistentes por sesión si no se configura otro valor (AC-004-01). */
export const DEFAULT_SESSION_MAX_ATTENDEES = 4;
export const SESSION_MIN_MINUTES = 15;
export const SESSION_MAX_MINUTES = 240;
/** Intervalo máximo que se puede pedir a la agenda. */
export const AGENDA_MAX_DAYS = 31;

export const sessionStatusSchema = z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionStatusLabels: Record<SessionStatus, string> = {
  SCHEDULED: 'Programada',
  IN_PROGRESS: 'En curso',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

/** Persona que aparece en una sesión: solo los datos para mostrar su nombre. */
export const sessionPersonSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  alias: z.string().nullable(),
});
export type SessionPerson = z.infer<typeof sessionPersonSchema>;

export const trainingSessionSchema = z.object({
  id: z.uuid(),
  trainer: sessionPersonSchema,
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  status: sessionStatusSchema,
  notes: z.string().nullable(),
  attendees: z.array(sessionPersonSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type TrainingSession = z.infer<typeof trainingSessionSchema>;

const MINUTE = 60_000;
const dateTime = z.iso.datetime({ offset: true, error: 'Usa una fecha y hora válidas.' });

/** Alta y edición de una sesión (AC-004-01). El servidor comprueba además la capacidad. */
export const saveSessionRequestSchema = z
  .object({
    startsAt: dateTime,
    endsAt: dateTime,
    /** Si no se indica, el entrenador es quien crea la sesión. */
    trainerId: z.uuid('Elige un entrenador.').optional(),
    clientIds: z
      .array(z.uuid('Elige un cliente.'))
      .min(1, 'Añade al menos un asistente.')
      .refine((ids) => new Set(ids).size === ids.length, 'Un cliente aparece dos veces.'),
    notes: z
      .string()
      .trim()
      .max(500, 'Las notas no pueden superar 500 caracteres.')
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
  })
  .superRefine((session, ctx) => {
    const minutes = (Date.parse(session.endsAt) - Date.parse(session.startsAt)) / MINUTE;
    if (minutes <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'La hora de fin debe ser posterior a la de inicio.',
      });
    } else if (minutes < SESSION_MIN_MINUTES || minutes > SESSION_MAX_MINUTES) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: `La sesión debe durar entre ${SESSION_MIN_MINUTES} minutos y ${SESSION_MAX_MINUTES / 60} horas.`,
      });
    }
  });
export type SaveSessionRequest = z.input<typeof saveSessionRequestSchema>;

/** AC-004-03: sesiones que empiezan en [from, to). */
export const listSessionsQuerySchema = z
  .object({ from: dateTime, to: dateTime })
  .refine((range) => Date.parse(range.to) > Date.parse(range.from), {
    path: ['to'],
    message: 'El final del intervalo debe ser posterior al inicio.',
  })
  .refine(
    (range) => Date.parse(range.to) - Date.parse(range.from) <= AGENDA_MAX_DAYS * 24 * 60 * MINUTE,
    { path: ['to'], message: `El intervalo no puede superar ${AGENDA_MAX_DAYS} días.` },
  );
export type ListSessionsQuery = z.input<typeof listSessionsQuerySchema>;

export const sessionListSchema = z.object({
  items: z.array(trainingSessionSchema),
  /** Capacidad configurada en el servidor, para que la web la respete. */
  maxAttendees: z.number().int().positive(),
});
export type SessionList = z.infer<typeof sessionListSchema>;
