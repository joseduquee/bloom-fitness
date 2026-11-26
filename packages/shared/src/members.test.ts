import { describe, expect, it } from 'vitest';
import { externalMemberSchema, membersProviderLabel } from './members';

describe('contratos de importación de socios', () => {
  it('normaliza el socio externo: recorta espacios y pasa el correo a minúsculas', () => {
    const member = externalMemberSchema.parse({
      externalId: ' 42 ',
      firstName: ' Lucía ',
      lastName: 'Martín ',
      email: 'Lucia.Martin@Socios.Bloom.TEST',
    });
    expect(member).toEqual({
      externalId: '42',
      firstName: 'Lucía',
      lastName: 'Martín',
      email: 'lucia.martin@socios.bloom.test',
    });
  });

  it('rechaza un socio sin identificador externo o con un correo no válido', () => {
    const base = { externalId: '1', firstName: 'A', lastName: 'B', email: 'a@b.es' };
    expect(externalMemberSchema.safeParse({ ...base, externalId: '' }).success).toBe(false);
    expect(externalMemberSchema.safeParse({ ...base, email: 'no-es-un-correo' }).success).toBe(
      false,
    );
  });

  it('traduce el origen a una etiqueta legible y deja tal cual uno desconocido', () => {
    expect(membersProviderLabel('mock')).toBe('Datos simulados');
    expect(membersProviderLabel('timp')).toBe('TIMP');
    expect(membersProviderLabel('otro')).toBe('otro');
  });
});
