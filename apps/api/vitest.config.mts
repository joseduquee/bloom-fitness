import { config as loadEnv } from 'dotenv';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Las pruebas usan su propia base de datos (bloom_test) definida en .env.test.
loadEnv({ path: '.env.test', override: true, quiet: true });

export default defineConfig({
  // SWC emite los metadatos de los decoradores que necesita la inyección de dependencias de Nest.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts', 'prisma/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    environment: 'node',
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/main.ts', '**/*.module.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
