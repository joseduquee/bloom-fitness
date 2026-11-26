import type { SessionPerson } from '@bloom/shared';

/** Nombre completo para listados. */
export function fullName(person: SessionPerson): string {
  return `${person.firstName} ${person.lastName}`;
}

/** Nombre corto: el alias si lo tiene, si no el nombre. */
export function shortName(person: SessionPerson): string {
  return person.alias ?? person.firstName;
}
