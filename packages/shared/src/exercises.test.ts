import { describe, expect, it } from 'vitest';
import { createExerciseRequestSchema, listExercisesQuerySchema } from './exercises';

describe('contratos de ejercicios', () => {
  it('convierte las instrucciones vacías en null y recorta el nombre', () => {
    const exercise = createExerciseRequestSchema.parse({
      name: '  Plancha frontal ',
      primaryMuscle: 'CORE',
      equipment: 'BODYWEIGHT',
      difficulty: 'BEGINNER',
      instructions: '   ',
    });
    expect(exercise).toMatchObject({ name: 'Plancha frontal', instructions: null });
  });

  it('AC-003-04: por defecto la búsqueda solo incluye los activos', () => {
    expect(listExercisesQuerySchema.parse({}).includeInactive).toBeUndefined();
    expect(listExercisesQuerySchema.parse({ includeInactive: 'true' }).includeInactive).toBe(true);
    expect(listExercisesQuerySchema.safeParse({ includeInactive: 'quizá' }).success).toBe(false);
  });
});
