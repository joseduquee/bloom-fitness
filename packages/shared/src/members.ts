import { z } from 'zod';
import { emailSchema } from './auth';

/** Proveedores de socios disponibles (spec 002). */
export const membersProviderSchema = z.enum(['mock', 'timp']);
export type MembersProviderId = z.infer<typeof membersProviderSchema>;

export const membersProviderLabels: Record<MembersProviderId, string> = {
  mock: 'Datos simulados',
  timp: 'TIMP',
};

/** Etiqueta legible de un origen guardado en un usuario. */
export function membersProviderLabel(source: string): string {
  const parsed = membersProviderSchema.safeParse(source);
  return parsed.success ? membersProviderLabels[parsed.data] : source;
}

const memberNameSchema = z.string().trim().min(1, 'Falta el nombre.').max(80);

/**
 * Socio tal y como lo entrega un proveedor. Solo los campos mínimos (RNF-08).
 * La importación valida cada socio con este esquema antes de guardarlo.
 */
export const externalMemberSchema = z.object({
  externalId: z.string().trim().min(1, 'Falta el identificador externo.').max(100),
  firstName: memberNameSchema,
  lastName: z.string().trim().min(1, 'Faltan los apellidos.').max(80),
  email: emailSchema,
});
export type ExternalMember = z.infer<typeof externalMemberSchema>;

export const importStatusSchema = z.enum(['SUCCEEDED', 'FAILED']);
export type ImportStatus = z.infer<typeof importStatusSchema>;

export const importStatusLabels: Record<ImportStatus, string> = {
  SUCCEEDED: 'Completada',
  FAILED: 'Fallida',
};

export const importErrorSchema = z.object({
  externalId: z.string().nullable(),
  message: z.string(),
});
export type ImportError = z.infer<typeof importErrorSchema>;

/** Resultado de una ejecución de la importación (AC-002-02). */
export const memberImportSchema = z.object({
  id: z.uuid(),
  source: z.string(),
  status: importStatusSchema,
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  durationMs: z.number().int().nonnegative(),
  triggeredBy: z.string().nullable(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  unchanged: z.number().int().nonnegative(),
  deactivated: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  errors: z.array(importErrorSchema),
  failureReason: z.string().nullable(),
});
export type MemberImport = z.infer<typeof memberImportSchema>;

export const memberImportListSchema = z.object({
  provider: z.object({ id: membersProviderSchema, label: z.string() }),
  items: z.array(memberImportSchema),
});
export type MemberImportList = z.infer<typeof memberImportListSchema>;
