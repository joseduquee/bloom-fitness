import { describe, expect, it } from 'vitest';
import { planImport, type ImportedUser } from './import-plan';

const member = (id: string, email = `${id.toLowerCase()}@x.es`) => ({
  externalId: id,
  firstName: 'Ana',
  lastName: 'Ruiz',
  email,
});

const imported = (id: string, overrides: Partial<ImportedUser> = {}): ImportedUser => ({
  id: `user-${id}`,
  ...member(id),
  isActive: true,
  externalMissingSince: null,
  ...overrides,
});

describe('planImport', () => {
  it('clasifica altas, actualizaciones, sin cambios y desactivaciones', () => {
    const plan = planImport(
      [member('A'), { ...member('B'), lastName: 'Otra' }, member('C')],
      [imported('A'), imported('B'), imported('D')],
      [
        { id: 'user-A', email: 'a@x.es' },
        { id: 'user-B', email: 'b@x.es' },
      ],
    );
    expect(plan.toCreate.map((m) => m.externalId)).toEqual(['C']);
    expect(plan.toUpdate).toEqual([
      { id: 'user-B', member: { ...member('B'), lastName: 'Otra' }, reactivate: false },
    ]);
    expect(plan.unchanged).toBe(1);
    expect(plan.toDeactivate).toEqual(['user-D']);
    expect(plan.errors).toEqual([]);
  });

  it('reactiva solo a quien había desactivado la propia importación', () => {
    const plan = planImport(
      [member('A'), member('B')],
      [
        imported('A', { isActive: false, externalMissingSince: new Date() }),
        imported('B', { isActive: false }),
      ],
      [],
    );
    expect(plan.toUpdate.map((u) => [u.id, u.reactivate])).toEqual([['user-A', true]]);
    expect(plan.unchanged).toBe(1);
  });

  it('no vuelve a desactivar a quien ya está inactivo', () => {
    const plan = planImport([], [imported('A', { isActive: false })], []);
    expect(plan.toDeactivate).toEqual([]);
  });

  it('no permite que dos socios del mismo lote compartan correo', () => {
    const plan = planImport([member('A', 'mismo@x.es'), member('B', 'mismo@x.es')], [], []);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.errors).toEqual([
      { externalId: 'B', message: 'El correo ya lo usa otro usuario de Bloom Fitness.' },
    ]);
  });

  it('registra el error sin identificador cuando el registro no lo trae', () => {
    const plan = planImport([{ firstName: 'Sin id' }, null], [], []);
    expect(plan.errors).toHaveLength(2);
    expect(plan.errors.every((error) => error.externalId === null)).toBe(true);
  });
});
