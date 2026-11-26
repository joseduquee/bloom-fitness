import { z } from 'zod';
import { emailSchema } from './auth';
import { roleSchema } from './roles';

/** Estado derivado de un usuario: sin contraseña aún, activo o desactivado. */
export const userStatusSchema = z.enum(['PENDING', 'ACTIVE', 'INACTIVE']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userStatusLabels: Record<UserStatus, string> = {
  PENDING: 'Pendiente de activar',
  ACTIVE: 'Activo',
  INACTIVE: 'Desactivado',
};

const nameSchema = z.string().trim().min(1, 'Este campo es obligatorio.').max(80);

export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  alias: z.string().nullable(),
  role: roleSchema,
  status: userStatusSchema,
  lastLoginAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type User = z.infer<typeof userSchema>;

export const createUserRequestSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  alias: z.string().trim().max(30).optional().nullable(),
  role: roleSchema,
});
export type CreateUserRequest = z.input<typeof createUserRequestSchema>;

export const updateUserRequestSchema = createUserRequestSchema.partial();
export type UpdateUserRequest = z.input<typeof updateUserRequestSchema>;

export const createUserResponseSchema = z.object({
  user: userSchema,
  activationUrl: z.url(),
});
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const activationLinkResponseSchema = z.object({
  activationUrl: z.url(),
  expiresAt: z.iso.datetime(),
});
export type ActivationLinkResponse = z.infer<typeof activationLinkResponseSchema>;

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  status: userStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.input<typeof listUsersQuerySchema>;

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  });
}

export const userListSchema = paginatedSchema(userSchema);
export type UserList = z.infer<typeof userListSchema>;
