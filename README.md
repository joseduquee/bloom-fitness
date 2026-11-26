# Bloom Fitness

Aplicación web para el seguimiento de entrenamientos personalizados en tiempo real.
Los entrenadores planifican rutinas y dirigen las sesiones, y las pantallas de la sala muestran
a cada cliente lo que le toca, sincronizadas al instante.

Trabajo Fin de Titulación · Bàtxelor en Informática · José Alexander Duque Pérez.

## Estructura

| Carpeta           | Contenido                                                                       |
| ----------------- | ------------------------------------------------------------------------------- |
| `apps/api`        | API REST y canal en tiempo real (NestJS, Prisma, PostgreSQL)                    |
| `apps/web`        | SPA: panel del entrenador, área del cliente y pantalla de sala (React)          |
| `packages/shared` | Contratos compartidos: esquemas zod, tipos y enums                              |
| `specs`           | Especificaciones de cada funcionalidad (desarrollo guiado por especificaciones) |

## Requisitos

- Node.js 22 (`.nvmrc`) y pnpm 10 (`corepack enable`)
- Docker Desktop (para PostgreSQL en local)

## Puesta en marcha

```powershell
corepack enable
pnpm install
docker compose up -d
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
# Genera el secreto JWT y pégalo en JWT_ACCESS_SECRET de apps/api/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/health · Documentación OpenAPI: http://localhost:3000/docs

### Usuarios de demostración (solo en local, los crea `pnpm db:seed`)

| Rol           | Correo                  | Contraseña          |
| ------------- | ----------------------- | ------------------- |
| Administrador | `admin@bloom.test`      | `BloomAdmin2026!`   |
| Entrenador    | `entrenador@bloom.test` | `BloomCoach2026!`   |
| Cliente       | `cliente@bloom.test`    | `BloomCliente2026!` |

Todos los datos son ficticios.

### Ejercicios, plantillas y rutinas

El `seed` carga un catálogo de 34 ejercicios sin GIF, tres plantillas (días A, B y C) y una rutina activa para
`cliente@bloom.test`. Los GIF que se suben desde **Ejercicios** se guardan en
`apps/api/uploads` (fuera del repositorio) y el API los sirve en `/media/`. En AWS irían a S3 detrás de CloudFront.

### Importación de socios

Con `MEMBERS_PROVIDER=mock` (valor por defecto), el administrador puede importar socios ficticios desde
**Importación**. Siempre son los mismos (`MOCK_MEMBERS_COUNT`, 30 por defecto) y usan el dominio reservado
`socios.bloom.test`. El adaptador de TIMP (`MEMBERS_PROVIDER=timp`) está preparado, pero no se usa con datos reales.

## Comprobaciones (las mismas que ejecuta la CI)

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Las pruebas de integración del API usan la base `bloom_test` (la crea `docker compose` la primera vez).
Antes de la primera ejecución: `pnpm db:test:migrate`.

## Flujo de trabajo

GitHub Flow: `main` protegida, ramas cortas (`feature/RF-09-sesion-en-directo`), _pull request_ con la CI en verde
y fusión por _squash_. Commits con [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

## Despliegue

Al fusionar en `main`, `.github/workflows/deploy.yml` publica el API en ECS Fargate y la web en S3 + CloudFront.
Ver `specs/000-plataforma/plan.md`.
