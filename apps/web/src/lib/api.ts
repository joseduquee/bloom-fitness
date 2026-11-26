import { apiErrorSchema, sessionResponseSchema, type ApiError } from '@bloom/shared';
import type { ZodType } from 'zod';
import { useSession } from '../features/auth/session-store';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/** Error del API con el formato común `ApiError`. */
export class ApiRequestError extends Error {
  constructor(public readonly body: ApiError) {
    super(body.message);
    this.name = 'ApiRequestError';
  }

  get status(): number {
    return this.body.statusCode;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Si es false, un 401 no intenta renovar la sesión (se usa en /auth/*). */
  retryOnUnauthorized?: boolean;
}

/**
 * Petición al API que valida la respuesta con un esquema de `@bloom/shared`.
 * Añade el token de acceso y, si caduca, renueva la sesión una vez y repite la petición.
 */
export async function apiFetch<T>(
  path: string,
  schema: ZodType<T>,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { retryOnUnauthorized = true, body, headers, ...init } = options;

  // Un FormData (subida de archivos) se envía tal cual: el navegador pone el Content-Type con su separador.
  const isForm = body instanceof FormData;
  const send = () => {
    const token = useSession.getState().accessToken;
    return fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await send().catch(() => {
    throw new ApiRequestError({
      statusCode: 0,
      error: 'Network Error',
      message: 'No se puede conectar con el servidor. Comprueba tu conexión.',
    });
  });

  if (response.status === 401 && retryOnUnauthorized && (await refreshSession())) {
    response = await send();
  }

  if (response.status === 204) {
    return schema.parse(undefined);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    throw new ApiRequestError(
      parsed.success
        ? parsed.data
        : {
            statusCode: response.status,
            error: response.statusText,
            message: 'Error inesperado del servidor.',
          },
    );
  }
  return schema.parse(payload);
}

let refreshing: Promise<boolean> | null = null;

/**
 * Renueva la sesión con la cookie de refresco. Si varias peticiones caducan a la vez,
 * comparten la misma renovación: el token de refresco solo se puede usar una vez.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) {
        useSession.getState().clear();
        return false;
      }
      useSession.getState().setSession(sessionResponseSchema.parse(await response.json()));
      return true;
    })
    .catch(() => {
      useSession.getState().clear();
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Mensaje en español para mostrar un error en la interfaz. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  return 'Se ha producido un error inesperado.';
}
