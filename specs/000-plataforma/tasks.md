# 000 · Tareas

Cada bloque corresponde a una rama y una *pull request*.

## `chore/000-monorepo` ✅
- [x] T001 Workspace pnpm, `tsconfig.base.json`, EditorConfig, Prettier y ESLint.
- [x] T002 `packages/shared` con esquemas de roles, salud y errores, y sus pruebas.
- [x] T003 `apps/api`: configuración validada (AC-000-09), Prisma, `/health`, filtro de errores, OpenAPI, logs con pino.
- [x] T004 `apps/web`: Vite, TanStack Router y Query, Tailwind, indicador de estado del API.
- [x] T005 `docker-compose.yml` con PostgreSQL y base de pruebas; migración inicial y seed (AC-000-01, AC-000-02).

## `ci/000-pipeline` ✅
- [x] T006 `ci.yml`: formato, linter, tipos, migraciones, pruebas con cobertura y build (AC-000-03).
- [x] T007 Dockerfile multi-etapa del API con usuario sin privilegios y *healthcheck*.
- [x] T008 `deploy.yml`: ECR, migraciones, ECS con espera de estabilidad, S3 + CloudFront y prueba de humo (AC-000-05 a AC-000-08).

## `chore/000-aws` (pendiente)
- [ ] T009 Crear la infraestructura en la cuenta propia de AWS (ver `docs/aws-setup.md`).
- [ ] T010 Configurar el rol OIDC y las variables del entorno `production` en GitHub.
- [ ] T011 Proteger `main`: PR obligatoria y comprobación `CI` requerida (AC-000-04).
- [ ] T012 Primer despliegue y captura de los workflows para la memoria.
