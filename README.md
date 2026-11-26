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
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:3000/health · Documentación OpenAPI: http://localhost:3000/docs

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
