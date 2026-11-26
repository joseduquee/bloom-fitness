import { createExerciseRequestSchema } from '@bloom/shared';
import { describe, expect, it } from 'vitest';
import { seedExercises } from './exercises';

describe('catálogo inicial de ejercicios', () => {
  it('AC-003-06: tiene al menos 30 ejercicios válidos con nombres únicos', () => {
    expect(seedExercises.length).toBeGreaterThanOrEqual(30);
    for (const exercise of seedExercises) {
      expect(createExerciseRequestSchema.safeParse(exercise).success).toBe(true);
    }
    const names = seedExercises.map((exercise) => exercise.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});
