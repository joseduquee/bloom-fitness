import { describe, expect, it } from 'vitest';
import {
  adjustExerciseRequestSchema,
  liveExerciseStatus,
  logSetRequestSchema,
  targetRepsValue,
} from './live';

describe('sesión en directo', () => {
  it('AC-004-11: valida peso (0–500, paso 0,25), repeticiones (0–100) y RPE opcional (1–10)', () => {
    const ok = (body: object) => logSetRequestSchema.safeParse(body).success;
    expect(ok({ weightKg: 82.5, reps: 8 })).toBe(true);
    expect(ok({ weightKg: 0, reps: 0, rpe: null })).toBe(true);
    expect(ok({ weightKg: 500, reps: 100, rpe: 10 })).toBe(true);
    expect(ok({ weightKg: 500.25, reps: 8 })).toBe(false);
    expect(ok({ weightKg: 60.1, reps: 8 })).toBe(false);
    expect(ok({ weightKg: 60, reps: 101 })).toBe(false);
    expect(ok({ weightKg: 60, reps: 8, rpe: 11 })).toBe(false);
  });

  it('un ejercicio está completado cuando tiene todas sus series, salvo que se haya omitido', () => {
    expect(liveExerciseStatus(3, 0, false)).toBe('PENDING');
    expect(liveExerciseStatus(3, 2, false)).toBe('PENDING');
    expect(liveExerciseStatus(3, 3, false)).toBe('COMPLETED');
    expect(liveExerciseStatus(3, 1, true)).toBe('SKIPPED');
  });

  it('AC-004-10: precarga las repeticiones objetivo cuando son un número o un rango', () => {
    expect(targetRepsValue('8-10')).toBe(8);
    expect(targetRepsValue(' 12 ')).toBe(12);
    expect(targetRepsValue('10 por pierna')).toBe(10);
    expect(targetRepsValue('40 s')).toBeNull();
    expect(targetRepsValue('1 min')).toBeNull();
    expect(targetRepsValue('al fallo')).toBeNull();
  });

  it('AC-004-14: el ajuste necesita una carga o un ejercicio', () => {
    expect(adjustExerciseRequestSchema.safeParse({}).success).toBe(false);
    expect(adjustExerciseRequestSchema.safeParse({ targetLoadKg: null }).success).toBe(true);
  });
});
