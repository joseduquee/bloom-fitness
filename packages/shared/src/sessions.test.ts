import { describe, expect, it } from 'vitest';
import { listSessionsQuerySchema, saveSessionRequestSchema } from './sessions';

const client = '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60';
const base = {
  startsAt: '2026-12-01T09:00:00.000Z',
  endsAt: '2026-12-01T10:00:00.000Z',
  clientIds: [client],
};
const messages = (input: object) =>
  saveSessionRequestSchema.safeParse({ ...base, ...input }).error?.issues.map((i) => i.message);

describe('sesiones', () => {
  it('AC-004-01: acepta una sesión con horario y asistentes, también con zona horaria', () => {
    expect(saveSessionRequestSchema.safeParse(base).success).toBe(true);
    expect(
      saveSessionRequestSchema.safeParse({
        ...base,
        startsAt: '2026-12-01T10:00:00+01:00',
        endsAt: '2026-12-01T11:00:00+01:00',
      }).success,
    ).toBe(true);
  });

  it('AC-004-01: valida la duración, los asistentes y los repetidos', () => {
    expect(messages({ endsAt: base.startsAt })).toEqual([
      'La hora de fin debe ser posterior a la de inicio.',
    ]);
    expect(messages({ endsAt: '2026-12-01T09:10:00.000Z' })).toEqual([
      'La sesión debe durar entre 15 minutos y 4 horas.',
    ]);
    expect(messages({ endsAt: '2026-12-01T14:00:00.000Z' })).toEqual([
      'La sesión debe durar entre 15 minutos y 4 horas.',
    ]);
    expect(messages({ clientIds: [] })).toEqual(['Añade al menos un asistente.']);
    expect(messages({ clientIds: [client, client] })).toEqual(['Un cliente aparece dos veces.']);
  });

  it('AC-004-03: la agenda admite intervalos de hasta 31 días', () => {
    const range = (to: string) =>
      listSessionsQuerySchema.safeParse({ from: '2026-12-01T00:00:00.000Z', to }).success;
    expect(range('2026-12-08T00:00:00.000Z')).toBe(true);
    expect(range('2027-01-01T00:00:00.000Z')).toBe(true);
    expect(range('2027-01-02T00:00:00.000Z')).toBe(false);
    expect(range('2026-11-30T00:00:00.000Z')).toBe(false);
  });
});
