import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` no necesita conexión (por ejemplo, al construir la imagen Docker),
    // así que la URL solo es obligatoria para migrar y para el seed.
    url: process.env.DATABASE_URL ?? '',
  },
});
