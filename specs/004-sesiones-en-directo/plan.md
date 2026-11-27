# 004 · Plan técnico

La spec se entrega en tres PR:

| PR | Contenido | Requisitos | Criterios |
|----|-----------|------------|-----------|
| A  | Planificación y agenda | RF-08 | AC-004-01 a AC-004-03 |
| B  | Dirigir la sesión, registrar series y cambios sobre la marcha (panel del entrenador) | RF-09, RF-10, RF-11 | AC-004-04 a AC-004-14, AC-003-11, AC-003-14 |
| C  | Difusión en tiempo real y medición de latencia | RF-13, RNF-01, RNF-02, RNF-07 | AC-004-15 a AC-004-19, SC-004-1 a SC-004-3 |

En el código la entidad se llama `TrainingSession` para no confundirla con la sesión de usuario de la spec 001.

## PR A · Planificación

### Modelo

```prisma
enum SessionStatus { SCHEDULED IN_PROGRESS FINISHED CANCELLED }

model TrainingSession {
  id, centerId, trainerId
  startsAt   DateTime         // UTC
  endsAt     DateTime         // UTC
  status     SessionStatus @default(SCHEDULED)
  notes      String?
  attendees  SessionAttendee[]
  @@index([centerId, startsAt])
}

model SessionAttendee {
  id, sessionId, clientId
  @@unique([sessionId, clientId])
  @@index([clientId])
}
```

La PR B añade a `SessionAttendee` el estado de asistencia, la rutina y la copia de la plantilla.

### Reglas

- Duración entre 15 minutos y 4 horas; el fin debe ser posterior al inicio.
- Como máximo `SESSION_MAX_ATTENDEES` asistentes (4 por defecto, configurable por variable de entorno). Al menos uno.
- Los asistentes deben ser clientes activos del centro. El entrenador debe ser un entrenador o administrador activo.
- **Solapamiento (AC-004-02)**: un cliente no puede estar en otra sesión no cancelada que se cruce en el tiempo.
  Dos intervalos se solapan si `inicio₁ < fin₂` y `inicio₂ < fin₁`; una sesión que empieza justo cuando acaba
  otra no se solapa. Respuesta 409 con los nombres afectados.
- Un entrenador crea sesiones para sí mismo; el administrador puede asignarlas a cualquier entrenador.
- **Permisos (AC-004-09)**: solo el entrenador asignado o un administrador modifica o cancela la sesión (403).
- Solo se edita o cancela una sesión `SCHEDULED` (409 en otro caso).
- La comprobación de solapamiento y el guardado no van en una transacción serializable: dos altas simultáneas del
  mismo cliente podrían pasar. Con un único centro y uno o dos entrenadores el riesgo es bajo y queda documentado.

### API

| Método y ruta                 | Acceso         | Descripción |
|-------------------------------|----------------|-------------|
| `GET /sessions?from=&to=`     | ADMIN, TRAINER | Sesiones del centro que empiezan en el intervalo (máximo 31 días), con asistentes y entrenador |
| `GET /sessions/:id`           | ADMIN, TRAINER | Detalle |
| `POST /sessions`              | ADMIN, TRAINER | Alta (201). 409 si hay solapamiento, 422 si un asistente no es válido |
| `PUT /sessions/:id`           | Entrenador asignado o ADMIN | Sustituye horario, asistentes, entrenador (solo ADMIN) y notas |
| `POST /sessions/:id/cancel`   | Entrenador asignado o ADMIN | Pasa a `CANCELLED` |

Los nombres de clientes y entrenadores se piden a `UsersService` (constitución §2.4).

### Frontend

- Menú **Agenda** (`/agenda`) para administradores y entrenadores, con vista de **día** y de **semana** (de lunes a
  domingo), botones de anterior, siguiente y hoy. La vista y la fecha van en la URL.
- Diálogo para crear y editar: fecha, hora de inicio y fin, entrenador (solo administrador), asistentes y notas.
- Las horas se introducen y se muestran en `Europe/Madrid` y viajan en UTC (constitución §4.4).

## PR B · Dirigir la sesión

### Modelo

- `TrainingSession` añade `startedAt`, `finishedAt` y `revision` (crece con cada cambio; la PR C la usa para que
  las pantallas descarten eventos atrasados).
- `SessionAttendee` añade la asistencia (`PRESENT` | `ABSENT`), la rutina y el día de los que sale la plantilla, el
  nombre de la plantilla en el momento de iniciar y el ejercicio en curso (`currentIndex`).
- `SessionExercise`: **copia** de cada ejercicio de la plantilla para ese asistente (AC-003-11, AC-004-05), con
  `originalExerciseId` si se sustituye y `skippedAt` si se omite.
- `SetLog`: serie registrada, única por `(sessionExerciseId, setNumber)` (AC-004-12). Guardar una serie que ya
  existe la corrige con un `upsert`.

El estado de cada ejercicio no se guarda: se calcula. Está completado si tiene todas sus series, omitido si tiene
`skippedAt` y pendiente en otro caso. Registrar una serie en un ejercicio omitido lo vuelve a contar como hecho.

### Rotación (AC-004-04, AC-003-14)

Al preparar la sesión se busca la última sesión **finalizada** en la que el cliente estuvo presente con su rutina
activa y se toma su posición. La siguiente es `nextRoutinePosition(plantillas, última)`. Si el entrenador elige otra
plantilla de la misma rutina, se guarda su posición; si elige una que no está en la rutina, la sesión no cuenta para
la rotación.

### API

Todas las escrituras devuelven la instantánea completa (`LiveSession`) y aumentan la revisión en la misma
transacción. Solo el entrenador asignado o un administrador escribe (403); otros entrenadores pueden ver el panel.

| Método y ruta | Descripción |
|---|---|
| `GET /sessions/:id/live` | Instantánea completa |
| `GET /sessions/:id/start-plan` | Plantilla propuesta para cada asistente |
| `POST /sessions/:id/start` | Inicia y copia las plantillas. Admite elegir otra por asistente |
| `PUT /sessions/:id/attendees/:clientId/template` | Cambia la plantilla durante la sesión si aún no hay series (409 en otro caso) |
| `PUT /sessions/:id/attendees/:clientId/attendance` | Presente o ausente (AC-004-06) |
| `POST /sessions/:id/attendees/:clientId/navigate` | `next`, `previous` o `skip` (AC-004-07) |
| `PUT /sessions/:id/attendees/:clientId/exercises/:position/sets/:setNumber` | Registra o corrige una serie |
| `PATCH /sessions/:id/attendees/:clientId/exercises/:position` | Cambia la carga o sustituye el ejercicio (AC-004-14) |
| `POST /sessions/:id/finish` | Finaliza (AC-004-08) |

### Panel del entrenador (`/sesiones/:id`)

- Programada: lista de asistentes con la plantilla propuesta y un selector para cambiarla; botón **Iniciar sesión**.
- En curso: una tarjeta por asistente con el progreso, el ejercicio en curso, las series registradas (se pulsan
  para corregirlas), el formulario de la siguiente serie con los valores precargados (AC-004-10) y los botones
  Anterior, Omitir y Siguiente. Cada tarjeta tiene su propio estado de carga y error (constitución §5.2).
- Si falla la red al guardar una serie, el formulario conserva lo escrito y muestra **Reintentar** (AC-004-13).
- Finalizada: resumen de lo que hizo cada asistente.
- Desde la agenda, el diálogo de la sesión enlaza con el panel.

## PR C · Tiempo real

### Arquitectura

```
Panel ──REST──► LiveSessionService ──guarda──► PostgreSQL
                      │ publica la instantánea
                      ▼
               LiveEventsService (Subject de RxJS)
                      │
                      ▼
               LiveGateway (Socket.IO, /live) ──► sala session:{id} → session:updated (panel)
                                               └► sala screen:{id}  → screen:session (pantallas)
```

- Las escrituras siguen entrando solo por REST (constitución §2.5). El servicio publica la instantánea ya guardada
  en un bus interno y la pasarela la reenvía. Así la lógica de la sesión no depende de Socket.IO y se puede probar
  sin él.
- El evento se difunde **antes** de responder a la petición REST, por eso el panel puede recibir el cambio de otro
  dispositivo casi a la vez que el suyo propio.

### Seguridad (AC-004-16, AC-004-17)

- Al conectar, un middleware de Socket.IO valida el token de acceso con el mismo `AccessTokenVerifier` que la guarda
  HTTP (firma, caducidad y usuario activo) y solo admite entrenadores y administradores. Sin token, con un token
  falso o de un cliente, la conexión se rechaza con un mensaje en español. La spec 005 añadirá el token de pantalla.
- Para unirse a la sala de una sesión se pide su instantánea con el centro de quien se conecta: una sesión de otro
  centro no existe para él y nunca entra en su sala.
- Mismos orígenes permitidos que la API REST (`CORS_ORIGINS`).
- Limitación conocida: si un usuario se desactiva con la conexión abierta, sigue recibiendo eventos hasta que
  se desconecta. Al reconectar ya se le rechaza.

### Eventos

| Evento | Dirección | Contenido |
|---|---|---|
| `session:subscribe` / `session:unsubscribe` | cliente → servidor | `{ sessionId }`; acuse `{ ok }` o `{ ok: false, error }` |
| `session:snapshot` | servidor → cliente | Instantánea completa al suscribirse |
| `session:updated` | servidor → sala | Instantánea completa tras cada cambio |
| `screen:subscribe` | cliente → servidor | `{ sessionId }` |
| `screen:session` | servidor → sala | Proyección sin datos personales (AC-004-18): alias o nombre de pila y entrenamiento |

Cada instantánea lleva su `revision`. El cliente solo acepta una instantánea si su revisión no es menor que la que
ya tiene, así un evento atrasado no deshace un cambio posterior.

### Panel (AC-004-19)

- Conexión única (`lib/socket.ts`) que lee el token en cada intento, así una reconexión usa el token renovado.
  Si el servidor lo rechaza por caducado, se renueva y se reintenta.
- Insignia con el estado: En directo, Reconectando… o Sin conexión en directo.
- **Actualización optimista**: registrar una serie, avanzar, omitir o marcar la asistencia se ven al momento.
  Si la petición falla se restaura el estado anterior (salvo que ya haya llegado otro más reciente) y el formulario
  de la serie conserva los valores para reintentar (AC-004-13).

### Medición (SC-004-1 a SC-004-3)

Script propio `apps/api/scripts/measure-latency.ts` (`pnpm --filter @bloom/api latency`), documentado en
`docs/metricas/README.md`. Se ha preferido a Artillery porque mide exactamente el recorrido que interesa (serie
enviada por REST → instantánea recibida en cada conexión) con todos los clientes en el mismo reloj, sin
instrumentar el servidor.
