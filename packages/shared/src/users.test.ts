import { describe, expect, it } from 'vitest';
import { loginRequestSchema, passwordSchema } from './auth';
import { createUserRequestSchema, listUsersQuerySchema } from './users';

describe('contratos de usuarios y acceso', () => {
  it('normaliza el correo a minúsculas y sin espacios', () => {
    const parsed = loginRequestSchema.parse({ email: '  Ana@Bloom.TEST ', password: 'x' });
    expect(parsed.email).toBe('ana@bloom.test');
  });

  it('exige contraseñas de al menos 10 caracteres', () => {
    expect(passwordSchema.safeParse('corta').success).toBe(false);
    expect(passwordSchema.safeParse('suficientemente-larga').success).toBe(true);
  });

  it('rechaza un alta sin nombre', () => {
    const result = createUserRequestSchema.safeParse({
      email: 'a@b.es',
      firstName: ' ',
      lastName: 'García',
      role: 'CLIENT',
    });
    expect(result.success).toBe(false);
  });

  it('aplica la paginación por defecto y convierte los números de la query', () => {
    expect(listUsersQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20 });
    expect(listUsersQuerySchema.parse({ page: '3' }).page).toBe(3);
  });
});
