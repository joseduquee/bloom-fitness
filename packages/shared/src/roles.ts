import { z } from 'zod';

/** Roles del sistema (spec 001). */
export const Role = {
  ADMIN: 'ADMIN',
  TRAINER: 'TRAINER',
  CLIENT: 'CLIENT',
} as const;

export const roleSchema = z.enum([Role.ADMIN, Role.TRAINER, Role.CLIENT]);
export type Role = z.infer<typeof roleSchema>;

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  TRAINER: 'Entrenador',
  CLIENT: 'Cliente',
};
