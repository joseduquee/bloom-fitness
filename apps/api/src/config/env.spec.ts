import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://bloom:bloom@localhost:5432/bloom',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('aplica valores por defecto a las variables opcionales', () => {
    const env = validateEnv(valid);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('separa los orígenes de CORS por comas', () => {
    const env = validateEnv({ ...valid, CORS_ORIGINS: 'https://a.es, https://b.es' });
    expect(env.CORS_ORIGINS).toEqual(['https://a.es', 'https://b.es']);
  });

  it('AC-000-09: indica qué variable obligatoria falta', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rechaza una URL de base de datos que no es de PostgreSQL', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'mysql://localhost/x' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('exige un secreto JWT de al menos 32 caracteres', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'corto' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('AC-002-06: usa el proveedor de socios simulado por defecto', () => {
    const env = validateEnv(valid);
    expect(env.MEMBERS_PROVIDER).toBe('mock');
    expect(env.MOCK_MEMBERS_COUNT).toBe(30);
  });

  it('exige la URL y la clave de TIMP cuando se elige ese proveedor', () => {
    expect(() =>
      validateEnv({ ...valid, MEMBERS_PROVIDER: 'timp', TIMP_API_URL: '', TIMP_API_KEY: '' }),
    ).toThrow(/TIMP_API_URL[\s\S]*TIMP_API_KEY/);
    const env = validateEnv({
      ...valid,
      MEMBERS_PROVIDER: 'timp',
      TIMP_API_URL: 'https://timp.example.com/api',
      TIMP_API_KEY: 'clave',
    });
    expect(env.MEMBERS_PROVIDER).toBe('timp');
  });
});
