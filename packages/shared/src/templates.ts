import { z } from 'zod';
import { equipmentSchema, muscleGroupSchema } from './exercises';
import { paginatedSchema } from './users';

/** Límites de una plantilla (AC-003-08). */
export const TEMPLATE_MAX_ITEMS = 30;
export const SETS_MIN = 1;
export const SETS_MAX = 10;

const emptyToNull = (value: string) => (value === '' ? null : value);

/** Un ejercicio dentro de una plantilla, tal y como lo envía el formulario (AC-003-08). */
export const templateItemInputSchema = z.object({
  exerciseId: z.uuid('Elige un ejercicio.'),
  sets: z
    .number('Escribe un número.')
    .int('Las series deben ser un número entero.')
    .min(SETS_MIN, `Entre ${SETS_MIN} y ${SETS_MAX} series.`)
    .max(SETS_MAX, `Entre ${SETS_MIN} y ${SETS_MAX} series.`),
  reps: z
    .string()
    .trim()
    .min(1, 'Indica las repeticiones.')
    .max(20, 'Como mucho 20 caracteres, por ejemplo «8-10».'),
  targetLoadKg: z
    .number('Escribe un número.')
    .min(0, 'La carga no puede ser negativa.')
    .max(999, 'La carga máxima es 999 kg.')
    .multipleOf(0.25, 'Usa múltiplos de 0,25 kg.')
    .nullable()
    .optional(),
  restSeconds: z
    .number('Escribe un número.')
    .int('El descanso debe ser un número entero de segundos.')
    .min(0, 'El descanso no puede ser negativo.')
    .max(600, 'El descanso máximo es de 600 s.'),
  notes: z
    .string()
    .trim()
    .max(200, 'Las notas no pueden superar 200 caracteres.')
    .transform(emptyToNull)
    .nullable()
    .optional(),
});
export type TemplateItemInput = z.input<typeof templateItemInputSchema>;

/** Alta y edición completa de una plantilla: el orden de `items` es el orden guardado (AC-003-07, AC-003-09). */
export const saveTemplateRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(80, 'El nombre no puede superar 80 caracteres.'),
  goal: z
    .string()
    .trim()
    .max(200, 'El objetivo no puede superar 200 caracteres.')
    .transform(emptyToNull)
    .nullable()
    .optional(),
  items: z
    .array(templateItemInputSchema)
    .min(1, 'Añade al menos un ejercicio.')
    .max(TEMPLATE_MAX_ITEMS, `Una plantilla admite como máximo ${TEMPLATE_MAX_ITEMS} ejercicios.`),
});
export type SaveTemplateRequest = z.input<typeof saveTemplateRequestSchema>;

/** Datos del ejercicio que se muestran dentro de una plantilla. */
export const templateExerciseSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  primaryMuscle: muscleGroupSchema,
  equipment: equipmentSchema,
  mediaUrl: z.string().nullable(),
  /** Si está desactivado, la plantilla lo sigue mostrando (AC-003-04). */
  isActive: z.boolean(),
});
export type TemplateExerciseSummary = z.infer<typeof templateExerciseSummarySchema>;

export const templateItemSchema = z.object({
  position: z.number().int().nonnegative(),
  exercise: templateExerciseSummarySchema,
  sets: z.number().int(),
  reps: z.string(),
  targetLoadKg: z.number().nullable(),
  restSeconds: z.number().int(),
  notes: z.string().nullable(),
});
export type TemplateItem = z.infer<typeof templateItemSchema>;

export const workoutTemplateSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  goal: z.string().nullable(),
  items: z.array(templateItemSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type WorkoutTemplate = z.infer<typeof workoutTemplateSchema>;

export const workoutTemplateSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  goal: z.string().nullable(),
  exerciseCount: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
});
export type WorkoutTemplateSummary = z.infer<typeof workoutTemplateSummarySchema>;

export const listTemplatesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListTemplatesQuery = z.input<typeof listTemplatesQuerySchema>;

export const workoutTemplateListSchema = paginatedSchema(workoutTemplateSummarySchema);
export type WorkoutTemplateList = z.infer<typeof workoutTemplateListSchema>;
