import { z } from 'zod';
import { roleSchema } from './roles';

/** Política de contraseñas (spec 001). */
export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(128, 'La contraseña es demasiado larga.');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Introduce un correo electrónico válido.').max(254));

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Introduce la contraseña.').max(128),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

/** Datos del usuario autenticado que necesita la interfaz. */
export const sessionUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  alias: z.string().nullable(),
  role: roleSchema,
  centerId: z.uuid(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  user: sessionUserSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const activateAccountRequestSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});
export type ActivateAccountRequest = z.infer<typeof activateAccountRequestSchema>;
