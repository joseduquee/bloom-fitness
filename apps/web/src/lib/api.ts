import { apiErrorSchema, type ApiError } from '@bloom/shared';
import type { ZodType } from 'zod';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Error del API con el formato común `ApiError`. */
export class ApiRequestError extends Error {
  constructor(public readonly body: ApiError) {
    super(body.message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Petición al API que valida la respuesta con un esquema de `@bloom/shared`.
 * Si la respuesta no cumple el contrato, falla en lugar de propagar datos incorrectos.
 */
export async function apiFetch<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiRequestError(
      parsed.success
        ? parsed.data
        : {
            statusCode: response.status,
            error: response.statusText,
            message: 'Error de conexión con el servidor.',
          },
    );
  }
  return schema.parse(body);
}
