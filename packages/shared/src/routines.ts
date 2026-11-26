import { z } from 'zod';

/** Plantillas por rutina: una semana con un día distinto cada día como mucho. */
export const ROUTINE_MAX_TEMPLATES = 7;

/** Letra con la que se muestra cada día de la rutina: 0 → A, 1 → B… */
export function routineDayLabel(position: number): string {
  return String.fromCharCode(65 + position);
}

/**
 * AC-003-14: posición de la plantilla que toca a continuación, rotando A → B → C → A.
 * `lastPosition` es la posición usada en la última sesión del cliente con esta rutina, o null si no hay.
 */
export function nextRoutinePosition(templateCount: number, lastPosition: number | null): number {
  if (templateCount <= 0) throw new Error('La rutina no tiene plantillas.');
  if (lastPosition === null || lastPosition < 0 || lastPosition >= templateCount) return 0;
  return (lastPosition + 1) % templateCount;
}

const isoDate = z.iso.date('Usa una fecha válida.');

/** AC-003-12. Las plantillas pueden repetirse (por ejemplo A, B, A). */
export const saveRoutineRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(80, 'El nombre no puede superar 80 caracteres.'),
    goal: z
      .string()
      .trim()
      .max(200, 'El objetivo no puede superar 200 caracteres.')
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
    startsOn: isoDate,
    endsOn: z
      .union([isoDate, z.literal('')])
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
    templateIds: z
      .array(z.uuid('Elige una plantilla.'))
      .min(1, 'Añade al menos una plantilla.')
      .max(
        ROUTINE_MAX_TEMPLATES,
        `Una rutina admite como máximo ${ROUTINE_MAX_TEMPLATES} plantillas.`,
      ),
  })
  .refine((routine) => !routine.endsOn || routine.endsOn >= routine.startsOn, {
    path: ['endsOn'],
    message: 'La fecha de fin no puede ser anterior a la de inicio.',
  });
export type SaveRoutineRequest = z.input<typeof saveRoutineRequestSchema>;

/** Alta: además indica si la rutina se activa al crearla (AC-003-13). */
export const createRoutineRequestSchema = z.intersection(
  saveRoutineRequestSchema,
  z.object({ activate: z.boolean().default(true) }),
);
export type CreateRoutineRequest = z.input<typeof createRoutineRequestSchema>;

export const routineTemplateSchema = z.object({
  position: z.number().int().nonnegative(),
  id: z.uuid(),
  name: z.string(),
  exerciseCount: z.number().int().nonnegative(),
});
export type RoutineTemplate = z.infer<typeof routineTemplateSchema>;

export const routineSchema = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  name: z.string(),
  goal: z.string().nullable(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date().nullable(),
  isActive: z.boolean(),
  templates: z.array(routineTemplateSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Routine = z.infer<typeof routineSchema>;

export const routineListSchema = z.object({ items: z.array(routineSchema) });
export type RoutineList = z.infer<typeof routineListSchema>;
