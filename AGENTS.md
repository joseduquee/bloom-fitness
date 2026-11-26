# Instrucciones para asistentes de IA

Este repositorio es el Trabajo Fin de Titulación de José Alexander Duque Pérez. El código que propongas
será revisado por el autor y debe poder explicarse en la defensa: prefiere soluciones simples y legibles.

## Antes de escribir código

1. Lee `specs/constitution.md`: sus normas son obligatorias.
2. Trabaja siempre a partir de una especificación de `specs/NNN-*/spec.md`. Si lo que se pide no está en ninguna, dilo.
3. Comprueba lo que ya existe antes de crear algo nuevo.

## Convenciones

- Identificadores en inglés; textos de interfaz y mensajes al usuario en español.
- Los contratos (DTO, eventos, enums) se definen en `packages/shared` con zod y se importan desde ambos lados.
- Backend: un módulo de NestJS por dominio; los controladores validan con `ZodValidationPipe`; la lógica va en servicios.
- No uses `import type` para clases que Nest inyecta (rompe los metadatos de los decoradores).
- Frontend: TanStack Query para datos del servidor; Zustand solo para estado de interfaz; estados de carga por entidad.
- Cada criterio de aceptación tiene una prueba cuyo nombre empieza por su identificador (`AC-001-04: ...`).
- Devuelve archivos completos, no fragmentos.

## Comandos

```bash
pnpm install
docker compose up -d          # PostgreSQL local
pnpm db:migrate && pnpm db:seed
pnpm dev                      # API :3000 y web :5173
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

El desarrollador trabaja en Windows con PowerShell: los scripts deben ser multiplataforma.
