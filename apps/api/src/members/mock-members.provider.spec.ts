import { externalMemberSchema } from '@bloom/shared';
import { describe, expect, it } from 'vitest';
import { mockMember, MockMembersProvider } from './mock-members.provider';

describe('MockMembersProvider', () => {
  it('AC-002-06: devuelve siempre los mismos socios para la misma configuración', async () => {
    const first = await new MockMembersProvider(50).fetchMembers();
    const second = await new MockMembersProvider(50).fetchMembers();
    expect(first).toHaveLength(50);
    expect(second).toEqual(first);
  });

  it('genera socios válidos, con identificadores y correos únicos en un dominio reservado', async () => {
    const members = await new MockMembersProvider(1000).fetchMembers();
    for (const member of members) {
      expect(externalMemberSchema.safeParse(member).success).toBe(true);
      expect(member.email.endsWith('@socios.bloom.test')).toBe(true);
    }
    expect(new Set(members.map((member) => member.externalId)).size).toBe(1000);
    expect(new Set(members.map((member) => member.email)).size).toBe(1000);
  });

  it('quita tildes y caracteres especiales del correo', () => {
    expect(mockMember(11)).toMatchObject({ firstName: 'Álvaro', externalId: 'SOC-0012' });
    expect(mockMember(11).email).toMatch(/^alvaro\.[a-z]+\.0012@socios\.bloom\.test$/);
  });
});
