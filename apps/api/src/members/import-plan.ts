import { externalMemberSchema, type ExternalMember, type ImportError } from '@bloom/shared';

/** Datos de un usuario ya importado que necesita el plan. */
export interface ImportedUser {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  externalMissingSince: Date | null;
}

/** Usuario que ya tiene un correo que aparece en el proveedor. */
export interface EmailOwner {
  id: string;
  email: string;
}

export interface MemberUpdate {
  id: string;
  member: ExternalMember;
  /** Había desaparecido del proveedor y vuelve: se reactiva. */
  reactivate: boolean;
}

export interface ImportPlan {
  toCreate: ExternalMember[];
  toUpdate: MemberUpdate[];
  unchanged: number;
  toDeactivate: string[];
  errors: ImportError[];
}

const EMAIL_IN_USE = 'El correo ya lo usa otro usuario de Bloom Fitness.';
const DUPLICATED_ID = 'El identificador externo está repetido en el proveedor.';

/** Identificador del registro aunque el resto no sea válido, para no desactivarlo por un error de formato. */
function rawExternalId(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null || !('externalId' in raw)) return null;
  const value = (raw as { externalId: unknown }).externalId;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  return String(value).trim() || null;
}

/**
 * Decide qué hacer con cada socio sin tocar la base de datos (spec 002, plan.md).
 * Es una función pura: recibe lo que devuelve el proveedor y lo que ya hay guardado.
 */
export function planImport(
  rawMembers: unknown[],
  imported: ImportedUser[],
  emailOwners: EmailOwner[],
): ImportPlan {
  const plan: ImportPlan = {
    toCreate: [],
    toUpdate: [],
    unchanged: 0,
    toDeactivate: [],
    errors: [],
  };
  const byExternalId = new Map(imported.map((user) => [user.externalId, user]));
  const ownerByEmail = new Map(emailOwners.map((owner) => [owner.email, owner.id]));
  const present = new Set<string>();
  const seen = new Set<string>();
  const claimedEmails = new Set<string>();

  for (const raw of rawMembers) {
    const rawId = rawExternalId(raw);
    if (rawId) present.add(rawId);

    const parsed = externalMemberSchema.safeParse(raw);
    if (!parsed.success) {
      plan.errors.push({
        externalId: rawId,
        message: parsed.error.issues[0]?.message ?? 'Registro no válido.',
      });
      continue;
    }
    const member = parsed.data;
    if (seen.has(member.externalId)) {
      plan.errors.push({ externalId: member.externalId, message: DUPLICATED_ID });
      continue;
    }
    seen.add(member.externalId);

    const current = byExternalId.get(member.externalId);
    const owner = ownerByEmail.get(member.email);
    // Nunca se vincula un socio a un usuario existente por el correo: podría ser un administrador.
    if ((owner !== undefined && owner !== current?.id) || claimedEmails.has(member.email)) {
      plan.errors.push({ externalId: member.externalId, message: EMAIL_IN_USE });
      continue;
    }
    claimedEmails.add(member.email);

    if (!current) {
      plan.toCreate.push(member);
      continue;
    }
    const changed =
      current.firstName !== member.firstName ||
      current.lastName !== member.lastName ||
      current.email !== member.email;
    // Solo se reactiva a quien desactivó la propia importación, nunca a quien desactivó el administrador.
    const reactivate = current.externalMissingSince !== null;
    if (changed || reactivate) {
      plan.toUpdate.push({ id: current.id, member, reactivate });
    } else {
      plan.unchanged += 1;
    }
  }

  // AC-002-05: quien ya no está en el proveedor no se borra, se desactiva.
  for (const user of imported) {
    if (user.isActive && !present.has(user.externalId)) plan.toDeactivate.push(user.id);
  }
  return plan;
}
