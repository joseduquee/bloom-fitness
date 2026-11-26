import { describe, expect, it } from 'vitest';
import {
  createRoutineRequestSchema,
  nextRoutinePosition,
  routineDayLabel,
  saveRoutineRequestSchema,
} from './routines';

const uuid = '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60';

describe('rutinas', () => {
  it('AC-003-14: propone la siguiente plantilla rotando A → B → C → A', () => {
    expect(nextRoutinePosition(3, null)).toBe(0);
    expect(nextRoutinePosition(3, 0)).toBe(1);
    expect(nextRoutinePosition(3, 1)).toBe(2);
    expect(nextRoutinePosition(3, 2)).toBe(0);
    expect(nextRoutinePosition(1, 0)).toBe(0);
  });

  it('AC-003-14: vuelve a empezar si la última posición ya no existe (la rutina se acortó)', () => {
    expect(nextRoutinePosition(2, 4)).toBe(0);
    expect(() => nextRoutinePosition(0, null)).toThrow();
  });

  it('nombra los días con letras', () => {
    expect([0, 1, 2].map(routineDayLabel)).toEqual(['A', 'B', 'C']);
  });

  it('AC-003-12: la fecha de fin es opcional pero no puede ser anterior a la de inicio', () => {
    const base = { name: 'Fuerza', startsOn: '2026-12-01', templateIds: [uuid] };
    expect(saveRoutineRequestSchema.parse({ ...base, endsOn: '' }).endsOn).toBeNull();
    expect(saveRoutineRequestSchema.safeParse({ ...base, endsOn: '2026-12-31' }).success).toBe(
      true,
    );
    const wrong = saveRoutineRequestSchema.safeParse({ ...base, endsOn: '2026-11-30' });
    expect(wrong.success).toBe(false);
    expect(wrong.error?.issues[0]?.path).toEqual(['endsOn']);
  });

  it('AC-003-13: una rutina nueva se activa por defecto', () => {
    const routine = createRoutineRequestSchema.parse({
      name: 'Fuerza',
      startsOn: '2026-12-01',
      templateIds: [uuid, uuid],
    });
    expect(routine.activate).toBe(true);
    expect(routine.templateIds).toHaveLength(2);
  });
});
