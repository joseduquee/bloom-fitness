import type { ExternalMember } from '@bloom/shared';
import type { MembersProvider } from './members-provider';

// prettier-ignore
const FIRST_NAMES = [
  'Lucía', 'Hugo', 'Martina', 'Mateo', 'Sofía', 'Leo', 'Julia', 'Pablo', 'Valeria', 'Daniel',
  'Paula', 'Álvaro', 'Carmen', 'Manuel', 'Noa', 'Adrián', 'Alba', 'Javier', 'Irene', 'Sergio',
  'Elena', 'Marcos', 'Claudia', 'Diego', 'Sara', 'Iván', 'Marta', 'Raúl', 'Nerea', 'Óscar',
] as const;

// prettier-ignore
const LAST_NAMES = [
  'García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz',
  'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez',
  'Vázquez', 'Ramos', 'Gil', 'Serrano', 'Blanco', 'Molina', 'Castro', 'Ortega', 'Rubio', 'Marín',
  'Sanz', 'Iglesias', 'Medina', 'Cortés', 'Castillo', 'Lozano', 'Garrido', 'Cano', 'Prieto',
] as const;

/** Dominio reservado para pruebas: ningún correo generado puede pertenecer a una persona real. */
const EMAIL_DOMAIN = 'socios.bloom.test';

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Socio ficticio número `index`. La misma posición produce siempre el mismo socio (AC-002-06).
 * Los multiplicadores son primos con la longitud de las listas para repartir bien las combinaciones.
 */
export function mockMember(index: number): ExternalMember {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length] ?? 'Socio';
  const surname1 = LAST_NAMES[(index * 7) % LAST_NAMES.length] ?? 'Ficticio';
  const surname2 = LAST_NAMES[(index * 11 + 3) % LAST_NAMES.length] ?? 'Ficticio';
  const number = String(index + 1).padStart(4, '0');
  return {
    externalId: `SOC-${number}`,
    firstName,
    lastName: `${surname1} ${surname2}`,
    email: `${slug(firstName)}.${slug(surname1)}.${number}@${EMAIL_DOMAIN}`,
  };
}

/** Adaptador con socios ficticios deterministas. Es el proveedor por defecto (AC-002-06). */
export class MockMembersProvider implements MembersProvider {
  readonly source = 'mock' as const;

  constructor(private readonly count: number) {}

  fetchMembers(): Promise<ExternalMember[]> {
    return Promise.resolve(Array.from({ length: this.count }, (_, index) => mockMember(index)));
  }
}
