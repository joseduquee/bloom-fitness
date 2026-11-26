import { describe, expect, it } from 'vitest';
import { saveTemplateRequestSchema } from './templates';

const item = {
  exerciseId: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
  sets: 4,
  reps: '8-10',
  targetLoadKg: 60,
  restSeconds: 90,
};

describe('plantillas', () => {
  it('AC-003-08: acepta series de 1 a 10, repeticiones como texto corto y carga opcional', () => {
    const template = saveTemplateRequestSchema.parse({
      name: 'Día A',
      goal: '',
      items: [item, { ...item, sets: 1, reps: '30 s', targetLoadKg: null, notes: '' }],
    });
    expect(template.goal).toBeNull();
    expect(template.items[1]).toMatchObject({ targetLoadKg: null, notes: null });
  });

  it('AC-003-08: rechaza series fuera de rango, cargas no válidas y repeticiones vacías', () => {
    const errors = (override: object) =>
      saveTemplateRequestSchema
        .safeParse({ name: 'Día A', items: [{ ...item, ...override }] })
        .error?.issues.map((issue) => issue.message);
    expect(errors({ sets: 11 })).toEqual(['Entre 1 y 10 series.']);
    expect(errors({ sets: 0 })).toEqual(['Entre 1 y 10 series.']);
    expect(errors({ targetLoadKg: 20.1 })).toEqual(['Usa múltiplos de 0,25 kg.']);
    expect(errors({ reps: ' ' })).toEqual(['Indica las repeticiones.']);
  });

  it('AC-003-07: exige al menos un ejercicio', () => {
    const result = saveTemplateRequestSchema.safeParse({ name: 'Día A', items: [] });
    expect(result.error?.issues[0]?.message).toBe('Añade al menos un ejercicio.');
  });
});
