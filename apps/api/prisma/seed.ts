/**
 * Datos simulados para desarrollo y demostraciones (constitución, §3.6).
 * Nunca se cargan datos personales reales.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main(): Promise<void> {
  const center = await prisma.center.upsert({
    where: { name: 'Bloom Fitness Demo' },
    update: {},
    create: { name: 'Bloom Fitness Demo' },
  });
  console.log(`Centro de demostración: ${center.name} (${center.id})`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
