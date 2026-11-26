import type { Role } from '@bloom/shared';

/** Usuario autenticado que las guardas añaden a cada petición. */
export interface AuthUser {
  id: string;
  role: Role;
  centerId: string;
}

/** Contenido del token de acceso. */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  centerId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- forma estándar de ampliar los tipos de Express
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
