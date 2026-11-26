/**
 * Datos simulados para desarrollo y demostraciones (constitución, §3.6).
 * Nunca se cargan datos personales reales. Se puede ejecutar varias veces.
 */
import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { createExerciseRequestSchema } from '@bloom/shared';
import { PrismaClient, type Role } from '../src/generated/prisma/client';
import { seedExercises } from './seed-data/exercises';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Contraseñas solo para el entorno local (se muestran en el README). */
const DEMO_PASSWORDS = {
  admin: 'BloomAdmin2026!',
  trainer: 'BloomCoach2026!',
  client: 'BloomCliente2026!',
};

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  alias: string | null;
  role: Role;
  password: string | null;
}

const users: SeedUser[] = [
  {
    email: 'admin@bloom.test',
    firstName: 'Laura',
    lastName: 'Admin Demo',
    alias: null,
    role: 'ADMIN',
    password: DEMO_PASSWORDS.admin,
  },
  {
    email: 'entrenador@bloom.test',
    firstName: 'Marcos',
    lastName: 'Coach Demo',
    alias: 'Marcos',
    role: 'TRAINER',
    password: DEMO_PASSWORDS.trainer,
  },
  {
    email: 'entrenadora@bloom.test',
    firstName: 'Irene',
    lastName: 'Coach Demo',
    alias: 'Irene',
    role: 'TRAINER',
    password: DEMO_PASSWORDS.trainer,
  },
  {
    email: 'cliente@bloom.test',
    firstName: 'Sergio',
    lastName: 'Cliente Uno',
    alias: 'Sergio',
    role: 'CLIENT',
    password: DEMO_PASSWORDS.client,
  },
  {
    email: 'cliente2@bloom.test',
    firstName: 'Carmen',
    lastName: 'Cliente Dos',
    alias: 'Carmen',
    role: 'CLIENT',
    password: DEMO_PASSWORDS.client,
  },
  {
    email: 'cliente3@bloom.test',
    firstName: 'Javier',
    lastName: 'Cliente Tres',
    alias: 'Javi',
    role: 'CLIENT',
    password: DEMO_PASSWORDS.client,
  },
  {
    email: 'cliente4@bloom.test',
    firstName: 'Lucía',
    lastName: 'Cliente Cuatro',
    alias: 'Lucía',
    role: 'CLIENT',
    password: DEMO_PASSWORDS.client,
  },
  {
    email: 'cliente5@bloom.test',
    firstName: 'Pablo',
    lastName: 'Cliente Cinco',
    alias: 'Pablo',
    role: 'CLIENT',
    password: null,
  },
  {
    email: 'cliente6@bloom.test',
    firstName: 'Elena',
    lastName: 'Cliente Seis',
    alias: 'Elena',
    role: 'CLIENT',
    password: null,
  },
];

async function main(): Promise<void> {
  const center = await prisma.center.upsert({
    where: { name: 'Bloom Fitness Demo' },
    update: {},
    create: { name: 'Bloom Fitness Demo' },
  });
  console.log(`Centro de demostración: ${center.name}`);

  for (const user of users) {
    const passwordHash = user.password ? await hash(user.password) : null;
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        centerId: center.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        alias: user.alias,
        role: user.role,
        passwordHash,
      },
    });
  }
  console.log(`Usuarios de demostración: ${users.length}`);
  console.log(`  admin@bloom.test / ${DEMO_PASSWORDS.admin}`);
  console.log(`  entrenador@bloom.test / ${DEMO_PASSWORDS.trainer}`);
  console.log(`  cliente@bloom.test / ${DEMO_PASSWORDS.client}`);

  // AC-003-06: catálogo inicial. Si un ejercicio ya existe no se toca, por si el entrenador lo ha editado.
  for (const raw of seedExercises) {
    const exercise = createExerciseRequestSchema.parse(raw);
    await prisma.exercise.upsert({
      where: { centerId_name: { centerId: center.id, name: exercise.name } },
      update: {},
      create: { centerId: center.id, ...exercise, instructions: exercise.instructions ?? null },
    });
  }
  console.log(`Ejercicios de demostración: ${seedExercises.length}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
