import { z } from 'zod';
import { paginatedSchema } from './users';

/** Músculo principal que trabaja un ejercicio. */
export const muscleGroupSchema = z.enum([
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'CORE',
  'QUADRICEPS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'FULL_BODY',
  'CARDIO',
]);
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  CHEST: 'Pecho',
  BACK: 'Espalda',
  SHOULDERS: 'Hombros',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  CORE: 'Abdomen y core',
  QUADRICEPS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  CALVES: 'Gemelos',
  FULL_BODY: 'Cuerpo completo',
  CARDIO: 'Cardiovascular',
};

export const equipmentSchema = z.enum([
  'BODYWEIGHT',
  'BARBELL',
  'DUMBBELL',
  'KETTLEBELL',
  'MACHINE',
  'CABLE',
  'BAND',
  'OTHER',
]);
export type Equipment = z.infer<typeof equipmentSchema>;

export const equipmentLabels: Record<Equipment, string> = {
  BODYWEIGHT: 'Peso corporal',
  BARBELL: 'Barra',
  DUMBBELL: 'Mancuernas',
  KETTLEBELL: 'Kettlebell',
  MACHINE: 'Máquina',
  CABLE: 'Polea',
  BAND: 'Banda elástica',
  OTHER: 'Otro',
};

export const difficultySchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export type Difficulty = z.infer<typeof difficultySchema>;

export const difficultyLabels: Record<Difficulty, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

/** Límites de la subida del GIF (AC-003-02). */
export const EXERCISE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const EXERCISE_MEDIA_TYPE = 'image/gif';

export const exerciseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  primaryMuscle: muscleGroupSchema,
  equipment: equipmentSchema,
  difficulty: difficultySchema,
  instructions: z.string().nullable(),
  /** URL pública del GIF o null si todavía no tiene. */
  mediaUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

const exerciseNameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(80, 'El nombre no puede superar 80 caracteres.');

const instructionsSchema = z
  .string()
  .trim()
  .max(2000, 'Las instrucciones no pueden superar 2000 caracteres.')
  .transform((value) => (value === '' ? null : value))
  .nullable();

/** AC-003-01. */
export const createExerciseRequestSchema = z.object({
  name: exerciseNameSchema,
  primaryMuscle: muscleGroupSchema,
  equipment: equipmentSchema,
  difficulty: difficultySchema,
  instructions: instructionsSchema.optional(),
});
export type CreateExerciseRequest = z.input<typeof createExerciseRequestSchema>;

export const updateExerciseRequestSchema = createExerciseRequestSchema.partial();
export type UpdateExerciseRequest = z.input<typeof updateExerciseRequestSchema>;

const booleanQuery = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

/** AC-003-05. */
export const listExercisesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  muscle: muscleGroupSchema.optional(),
  equipment: equipmentSchema.optional(),
  /** Incluye los desactivados (AC-003-04). Por defecto, solo los activos. */
  includeInactive: booleanQuery,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListExercisesQuery = z.input<typeof listExercisesQuerySchema>;

export const exerciseListSchema = paginatedSchema(exerciseSchema);
export type ExerciseList = z.infer<typeof exerciseListSchema>;
