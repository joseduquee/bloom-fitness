# 000 · Plataforma: monorepo, entorno local y CI/CD

**Iteración:** 0 · **Prioridad:** Must · **Requisitos:** RNF-06, RNF-09, RNF-11, RNF-13, OE7

## Contexto

Antes de construir funcionalidades hace falta una base que permita desarrollar, probar y desplegar
de forma repetible. Esta especificación no aporta valor directo al entrenador, pero todo lo demás depende de ella.

## Historias de usuario

### HU-000-1 · Entorno local en un comando (P1)
Como desarrollador, quiero levantar todo el sistema en local con un par de comandos,
para poder trabajar sin depender de la nube.

- **AC-000-01** Dado un equipo con Node 22, pnpm y Docker, cuando ejecuto `pnpm install`, `docker compose up -d` y `pnpm dev`,
  entonces el API responde en `http://localhost:3000/health` y la web en `http://localhost:5173`.
- **AC-000-02** Dado el entorno local levantado, cuando ejecuto `pnpm db:migrate` y `pnpm db:seed`,
  entonces la base de datos queda con el esquema actual y datos simulados.

### HU-000-2 · Comprobaciones automáticas en cada PR (P1)
Como desarrollador, quiero que cada *pull request* se compruebe automáticamente,
para no integrar en `main` código que no compila o rompe pruebas.

- **AC-000-03** Dada una PR contra `main`, cuando se abre o actualiza, entonces GitHub Actions ejecuta
  formato, linter, tipos, pruebas (con un PostgreSQL efímero) y compilación de todos los paquetes.
- **AC-000-04** Dada una PR con alguna comprobación fallida, entonces la fusión queda bloqueada.

### HU-000-3 · Despliegue automático al fusionar (P1)
Como desarrollador, quiero que al fusionar en `main` el sistema se despliegue solo,
para que producción refleje siempre la última versión validada.

- **AC-000-05** Dada una fusión en `main`, cuando termina el workflow de despliegue, entonces la imagen del API está en ECR
  etiquetada con el SHA del commit, las migraciones aplicadas y el servicio de ECS actualizado.
- **AC-000-06** Dada la misma fusión, entonces la SPA está publicada en S3 y la caché de CloudFront invalidada.
- **AC-000-07** Dado un despliegue, cuando la nueva tarea no supera la comprobación de salud, entonces ECS mantiene la anterior
  (despliegue sin interrupción, RNF-13).
- **AC-000-08** El workflow se autentica en AWS con OIDC; el repositorio no contiene claves de acceso.

### HU-000-4 · Configuración validada (P2)
- **AC-000-09** Dado que falta una variable de entorno obligatoria, cuando arranca el API, entonces termina con un error
  que indica qué variable falta.

## Criterios de éxito

| ID      | Métrica                                               | Objetivo   |
|---------|-------------------------------------------------------|------------|
| SC-000-1 | Tiempo del workflow de PR                            | < 8 min    |
| SC-000-2 | Tiempo desde la fusión hasta producción (OE7)        | < 15 min (deseable) |
| SC-000-3 | Tamaño de la imagen del API (sin comprimir)          | < 500 MB   |

## Fuera de alcance

- Entorno de preproducción (justificado en la memoria, apartado 4.3.5).
- Infraestructura como código para todo AWS: se valora en la iteración 0b (Terraform) si hay tiempo.
