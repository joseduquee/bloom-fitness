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

describe('plantillas de ejemplo', () => {
  it('solo usan ejercicios del catálogo inicial y son válidas', async () => {
    const { saveTemplateRequestSchema } = await import('@bloom/shared');
    const { seedTemplates } = await import('./templates');
    const names = new Set(seedExercises.map((exercise) => exercise.name));
    for (const template of seedTemplates) {
      for (const item of template.items) expect(names.has(item.exercise)).toBe(true);
      const items = template.items.map(({ exercise: _exercise, ...rest }) => ({
        ...rest,
        exerciseId: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
      }));
      expect(saveTemplateRequestSchema.safeParse({ ...template, items }).success).toBe(true);
    }
  });
});
