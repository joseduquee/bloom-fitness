# 000 · Plan técnico

## Estructura del monorepo

```
bloom-fitness/
├── apps/
│   ├── api/            NestJS 12 (CommonJS) + Prisma 7 + PostgreSQL
│   └── web/            React 19 + Vite 8 + TanStack Router/Query + Tailwind CSS 4
├── packages/
│   └── shared/         Esquemas zod, tipos y enums compartidos (ESM + CJS con tsup)
├── specs/              Especificaciones (esta carpeta)
├── .github/workflows/  ci.yml (PR) y deploy.yml (main)
└── docker-compose.yml  PostgreSQL local
```

Gestor de paquetes: **pnpm workspaces**. Node 22 LTS.

## Decisiones técnicas

| Decisión               | Elegida                         | Alternativas descartadas                   | Motivo |
|------------------------|---------------------------------|--------------------------------------------|--------|
| Lenguaje               | TypeScript en todo el sistema   | C#/.NET en el backend; JavaScript          | Un solo lenguaje permite compartir contratos entre API y web; tipado estricto. |
| Framework del backend  | NestJS 12                       | Express o Fastify sin framework; ASP.NET Core; Spring Boot | Módulos, inyección de dependencias y soporte nativo de WebSocket; misma pila que el frontend. |
| ORM                    | Prisma 7 con adaptador `pg`     | TypeORM; Drizzle; SQL a mano               | Esquema declarativo, migraciones versionadas y cliente tipado. |
| Base de datos          | PostgreSQL 16 (Supabase en producción) | MySQL; MongoDB; Amazon RDS          | Modelo relacional claro; Supabase más barato que RDS para el volumen previsto. |
| Validación             | zod 4 en `packages/shared`      | class-validator; validación duplicada      | Las mismas reglas en el navegador y en el servidor. |
| Tiempo real            | Socket.IO                       | `ws` nativo; SSE; API Gateway WebSocket; servicios gestionados (Pusher, Ably) | Reconexión automática y salas; integración con NestJS; sin coste por mensaje. |
| Frontend               | React 19 + Vite 8               | Vue; Angular; Next.js                      | Ecosistema amplio; SPA sin necesidad de SSR. |
| Enrutado y datos       | TanStack Router y Query         | React Router; Redux Toolkit Query          | Rutas tipadas y caché de servidor con estados por entidad. |
| Estilos                | Tailwind CSS 4                  | CSS Modules; Material UI                   | Diseño propio rápido y coherente. |
| Pruebas                | Vitest en todo el monorepo      | Jest en el backend                         | Un solo ejecutor; NestJS 12 lo adopta por defecto. |
| Cómputo en AWS         | ECS Fargate                     | EC2; App Runner; Lambda                    | Contenedores sin gestionar servidores; Lambda no mantiene conexiones WebSocket largas. |
| CI/CD                  | GitHub Actions + OIDC           | GitLab CI; Jenkins; claves de acceso en secretos | Integrado con el repositorio; sin credenciales de larga duración. |

## Variables de entorno del API

| Variable       | Obligatoria | Ejemplo                                        |
|----------------|-------------|------------------------------------------------|
| `DATABASE_URL` | Sí          | `postgresql://bloom:bloom@localhost:5432/bloom` |
| `PORT`         | No (3000)   | `3000`                                         |
| `CORS_ORIGINS` | No          | `https://www.bloomfitness.es`                  |
| `LOG_LEVEL`    | No (info)   | `debug`                                        |
| `APP_VERSION`  | No (dev)    | SHA del commit, lo fija el despliegue          |

## Contratos

- `GET /health` → `HealthResponse` (`packages/shared/src/health.ts`). 200 si la base de datos responde; 503 si no.
- Todos los errores siguen `ApiError` (`packages/shared/src/errors.ts`).
- OpenAPI en `/docs`.

## Despliegue

- **CI (`ci.yml`)**: en cada PR y en `main`. PostgreSQL efímero como servicio del job.
- **Deploy (`deploy.yml`)**: en `main`. Tres jobs: `api` (imagen → ECR, migraciones, ECS), `web` (S3 + CloudFront) y `smoke`
  (comprueba que `/health` devuelve la versión recién desplegada).
- Los identificadores de AWS son variables del entorno `production` de GitHub, no se versionan.
