import { describe, expect, it } from 'vitest';
import { Role, roleLabels, roleSchema } from './roles';

describe('roles', () => {
  it('acepta los tres roles del sistema', () => {
    for (const role of Object.values(Role)) {
      expect(roleSchema.parse(role)).toBe(role);
    }
  });

  it('rechaza un rol desconocido', () => {
    expect(roleSchema.safeParse('SUPER_ADMIN').success).toBe(false);
  });

  it('tiene una etiqueta en español para cada rol', () => {
    expect(Object.keys(roleLabels).sort()).toEqual(Object.values(Role).sort());
  });
});
