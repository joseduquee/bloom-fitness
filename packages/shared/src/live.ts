import { z } from 'zod';
import { sessionPersonSchema, sessionStatusSchema } from './sessions';
import { templateExerciseSummarySchema } from './templates';

/** Spec 004 · PR B: estado de una sesión mientras se dirige. */

export const attendanceSchema = z.enum(['PRESENT', 'ABSENT']);
export type Attendance = z.infer<typeof attendanceSchema>;

export const attendanceLabels: Record<Attendance, string> = {
  PRESENT: 'Presente',
  ABSENT: 'Ausente',
};

/** Pendiente, completado (tiene todas sus series) u omitido. */
export const liveExerciseStatusSchema = z.enum(['PENDING', 'COMPLETED', 'SKIPPED']);
export type LiveExerciseStatus = z.infer<typeof liveExerciseStatusSchema>;

/** Límites de una serie (AC-004-11). */
export const SET_WEIGHT_MAX_KG = 500;
export const SET_REPS_MAX = 100;

export const setLogSchema = z.object({
  setNumber: z.number().int().positive(),
  weightKg: z.number(),
  reps: z.number().int(),
  rpe: z.number().int().nullable(),
});
export type SetLog = z.infer<typeof setLogSchema>;

export const liveExerciseSchema = z.object({
  position: z.number().int().nonnegative(),
  exercise: templateExerciseSummarySchema,
  /** Si se sustituyó durante la sesión, el ejercicio que había en la plantilla (AC-004-14). */
  originalExerciseId: z.uuid().nullable(),
  sets: z.number().int(),
  reps: z.string(),
  targetLoadKg: z.number().nullable(),
  restSeconds: z.number().int(),
  notes: z.string().nullable(),
  status: liveExerciseStatusSchema,
  logs: z.array(setLogSchema),
});
export type LiveExercise = z.infer<typeof liveExerciseSchema>;

export const liveAttendeeSchema = z.object({
  client: sessionPersonSchema,
  attendance: attendanceSchema,
  /** Rutina de la que sale la plantilla y día que toca (A, B, C…). */
  routine: z.object({ id: z.uuid(), name: z.string(), day: z.string() }).nullable(),
  template: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  /** Posición del ejercicio en curso. */
  currentIndex: z.number().int().nonnegative(),
  exercises: z.array(liveExerciseSchema),
});
export type LiveAttendee = z.infer<typeof liveAttendeeSchema>;

/** Instantánea completa para el panel del entrenador. */
export const liveSessionSchema = z.object({
  id: z.uuid(),
  status: sessionStatusSchema,
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  finishedAt: z.iso.datetime().nullable(),
  trainer: sessionPersonSchema,
  /** Crece con cada cambio. Sirve para descartar eventos antiguos en tiempo real (PR C). */
  revision: z.number().int().nonnegative(),
  attendees: z.array(liveAttendeeSchema),
});
export type LiveSession = z.infer<typeof liveSessionSchema>;

/** AC-004-04: propuesta de plantilla para cada asistente antes de iniciar. */
export const startPlanSchema = z.object({
  attendees: z.array(
    z.object({
      client: sessionPersonSchema,
      routine: z
        .object({
          id: z.uuid(),
          name: z.string(),
          templates: z.array(
            z.object({ position: z.number().int(), id: z.uuid(), name: z.string() }),
          ),
        })
        .nullable(),
      /** Plantilla que toca según la rotación (AC-003-14), o null si no tiene rutina activa. */
      proposedTemplateId: z.uuid().nullable(),
      proposedPosition: z.number().int().nullable(),
    }),
  ),
});
export type StartPlan = z.infer<typeof startPlanSchema>;

/** Plantilla elegida para cada asistente. Si falta uno, se usa la propuesta. */
export const startSessionRequestSchema = z.object({
  assignments: z
    .array(z.object({ clientId: z.uuid(), templateId: z.uuid().nullable() }))
    .default([]),
});
export type StartSessionRequest = z.input<typeof startSessionRequestSchema>;

export const changeTemplateRequestSchema = z.object({ templateId: z.uuid('Elige una plantilla.') });
export type ChangeTemplateRequest = z.input<typeof changeTemplateRequestSchema>;

export const setAttendanceRequestSchema = z.object({ attendance: attendanceSchema });
export type SetAttendanceRequest = z.input<typeof setAttendanceRequestSchema>;

/** AC-004-07. */
export const navigateRequestSchema = z.object({ action: z.enum(['next', 'previous', 'skip']) });
export type NavigateRequest = z.input<typeof navigateRequestSchema>;

/** AC-004-11. */
export const logSetRequestSchema = z.object({
  weightKg: z
    .number('Escribe un número.')
    .min(0, `El peso debe estar entre 0 y ${SET_WEIGHT_MAX_KG} kg.`)
    .max(SET_WEIGHT_MAX_KG, `El peso debe estar entre 0 y ${SET_WEIGHT_MAX_KG} kg.`)
    .multipleOf(0.25, 'Usa múltiplos de 0,25 kg.'),
  reps: z
    .number('Escribe un número.')
    .int('Las repeticiones deben ser un número entero.')
    .min(0, `Entre 0 y ${SET_REPS_MAX} repeticiones.`)
    .max(SET_REPS_MAX, `Entre 0 y ${SET_REPS_MAX} repeticiones.`),
  rpe: z
    .number('Escribe un número.')
    .int('El RPE es un número entero.')
    .min(1, 'El RPE va de 1 a 10.')
    .max(10, 'El RPE va de 1 a 10.')
    .nullable()
    .optional(),
});
export type LogSetRequest = z.input<typeof logSetRequestSchema>;

/** AC-004-14: cambio de carga objetivo o sustitución del ejercicio, solo en esta sesión. */
export const adjustExerciseRequestSchema = z
  .object({
    targetLoadKg: z
      .number('Escribe un número.')
      .min(0, 'La carga no puede ser negativa.')
      .max(999, 'La carga máxima es 999 kg.')
      .multipleOf(0.25, 'Usa múltiplos de 0,25 kg.')
      .nullable()
      .optional(),
    exerciseId: z.uuid('Elige un ejercicio.').optional(),
  })
  .refine((body) => body.targetLoadKg !== undefined || body.exerciseId !== undefined, {
    message: 'Indica la carga o el ejercicio nuevo.',
  });
export type AdjustExerciseRequest = z.input<typeof adjustExerciseRequestSchema>;

/** Estado de un ejercicio a partir de sus series registradas. */
export function liveExerciseStatus(
  sets: number,
  loggedSets: number,
  skipped: boolean,
): LiveExerciseStatus {
  if (skipped) return 'SKIPPED';
  return loggedSets >= sets ? 'COMPLETED' : 'PENDING';
}

/**
 * Repeticiones que se precargan en el panel a partir del objetivo de la plantilla (AC-004-10):
 * «8-10» → 8, «10 por pierna» → 10, «40 s» o «1 min» → null (es un tiempo, no repeticiones).
 */
export function targetRepsValue(reps: string): number | null {
  if (/\d\s*(s|seg|min)\b/i.test(reps)) return null;
  const match = /^\s*(\d+)/.exec(reps);
  return match ? Number(match[1]) : null;
}
