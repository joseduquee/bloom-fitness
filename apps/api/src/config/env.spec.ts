import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

const valid = { DATABASE_URL: 'postgresql://bloom:bloom@localhost:5432/bloom' };

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
    expect(() => validateEnv({ DATABASE_URL: 'mysql://localhost/x' })).toThrow(/DATABASE_URL/);
  });
});
