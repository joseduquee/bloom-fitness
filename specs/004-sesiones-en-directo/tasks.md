# 004 · Tareas

## PR A · Planificación y agenda

Rama: `feature/RF-08-planificacion-sesiones`

- [x] T401 Esquemas zod de sesiones en `packages/shared`.
- [x] T402 Modelos `TrainingSession` y `SessionAttendee` y migración.
- [x] T403 `SessionsService`: alta, edición, cancelación y listado por intervalo (AC-004-01, AC-004-03).
- [x] T404 Solapamiento de clientes (AC-004-02) y permisos del entrenador asignado (AC-004-09 en la planificación).
- [x] T405 Pruebas de integración de AC-004-01 a AC-004-03.
- [x] T406 Agenda diaria y semanal con diálogo de alta y edición.
- [x] T407 Pruebas de componentes y de la conversión de horas de Madrid a UTC.

## PR B · Dirigir la sesión

Rama: `feature/RF-09-dirigir-sesion`

- [x] T410 Inicio de sesión con propuesta de plantilla por rotación (AC-004-04, AC-003-14) y copia (AC-004-05, AC-003-11).
- [x] T411 Asistencia, navegación entre ejercicios y omitidos (AC-004-06, AC-004-07).
- [x] T412 Registro y corrección de series (AC-004-10 a AC-004-12).
- [x] T413 Cambios sobre la marcha (AC-004-14) y finalización (AC-004-08).
- [x] T414 Panel del entrenador con reintento si falla la red (AC-004-13).

## PR C · Tiempo real

Rama: `feature/RF-13-tiempo-real`

- [ ] T420 Pasarela Socket.IO con autenticación y salas por centro (AC-004-16, AC-004-17).
- [ ] T421 Difusión de `session:updated` e instantánea para pantallas sin datos personales (AC-004-15, AC-004-18).
- [ ] T422 Actualización optimista en el panel (AC-004-19).
- [ ] T423 Script de medición de latencia y reconexión (SC-004-1 a SC-004-3).
