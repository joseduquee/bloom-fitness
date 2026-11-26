import { z } from 'zod';

/** Una variable presente pero vacía (`CLAVE=`) cuenta como no definida. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

/**
 * Variables de entorno del API. Se validan al arrancar: si falta alguna obligatoria,
 * el proceso termina indicando cuál (AC-000-09).
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    APP_VERSION: z.string().default('dev'),
    /** Secreto para firmar los tokens de acceso (HS256). */
    JWT_ACCESS_SECRET: z.string().min(32, 'Debe tener al menos 32 caracteres.'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
    REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    /** URL pública de la web; se usa para construir los enlaces de activación. */
    WEB_URL: z.url().default('http://localhost:5173'),
    /** Proveedor de socios para la importación (spec 002). */
    MEMBERS_PROVIDER: z.enum(['mock', 'timp']).default('mock'),
    MOCK_MEMBERS_COUNT: z.coerce.number().int().min(0).max(1000).default(30),
    TIMP_API_URL: optional(z.url()),
    TIMP_API_KEY: optional(z.string()),
  })
  .superRefine((env, ctx) => {
    if (env.MEMBERS_PROVIDER !== 'timp') return;
    for (const key of ['TIMP_API_URL', 'TIMP_API_KEY'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'Es obligatoria cuando MEMBERS_PROVIDER=timp.',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración no válida. Revisa las variables de entorno:\n${problems}`);
  }
  return result.data;
}
