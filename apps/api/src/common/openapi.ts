import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z, type ZodType } from 'zod';

/**
 * Convierte un esquema zod de `@bloom/shared` en un esquema OpenAPI, para que la
 * documentación de /docs salga de los mismos contratos que validan las peticiones.
 */
export function openApiSchema(schema: ZodType, io: 'input' | 'output' = 'output'): SchemaObject {
  const json = z.toJSONSchema(schema, {
    io,
    target: 'openapi-3.0',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  delete json.$schema;
  return json as SchemaObject;
}
