import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ name: z.string().min(2) }));

  it('devuelve el valor validado', () => {
    expect(pipe.transform({ name: 'Ana' })).toEqual({ name: 'Ana' });
  });

  it('lanza 400 con el detalle de cada campo', () => {
    try {
      pipe.transform({ name: 'A' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse() as { details: unknown[] };
      expect(body.details).toEqual([{ path: 'name', message: expect.any(String) }]);
    }
  });
});
