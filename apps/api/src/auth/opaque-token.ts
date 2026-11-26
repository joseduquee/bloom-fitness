import { createHash, randomBytes } from 'node:crypto';

/**
 * Tokens opacos para el refresco de sesión y la activación de cuentas.
 * Se entrega al usuario el valor aleatorio y en la base de datos solo se guarda su hash,
 * de modo que una filtración de la base de datos no permite suplantar a nadie.
 */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
