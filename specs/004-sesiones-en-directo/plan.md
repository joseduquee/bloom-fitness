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
