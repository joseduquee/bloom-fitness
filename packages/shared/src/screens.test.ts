import { describe, expect, it } from 'vitest';
import { pairScreenRequestSchema } from './screens';

describe('emparejamiento de pantallas', () => {
  it('AC-005-02: admite el código en minúsculas, con espacios o guion', () => {
    expect(pairScreenRequestSchema.parse({ code: 'abc 234' }).code).toBe('ABC234');
    expect(pairScreenRequestSchema.parse({ code: 'ABC-234' }).code).toBe('ABC234');
  });

  it('rechaza códigos de otra longitud o con caracteres ambiguos', () => {
    expect(pairScreenRequestSchema.safeParse({ code: 'ABC23' }).success).toBe(false);
    expect(pairScreenRequestSchema.safeParse({ code: 'ABC10O' }).success).toBe(false);
  });
});
