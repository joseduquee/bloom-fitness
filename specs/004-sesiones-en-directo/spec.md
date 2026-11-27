# 004 · Sesiones en directo y tiempo real

**Iteración:** 3 (2 semanas) · **Requisitos:** RF-08, RF-09, RF-10, RF-11, RF-13, RNF-01, RNF-02, RNF-07
**Casos de uso:** CU-01, CU-02, CU-03

## Contexto

Es la funcionalidad diferencial del sistema. Durante una sesión de hasta cuatro clientes, el entrenador
dirige desde el panel y las pantallas de sala muestran a cada cliente lo que le toca, actualizado al instante.

## Ciclo de vida

```
SCHEDULED ──iniciar──▶ IN_PROGRESS ──finalizar──▶ FINISHED
    └──────────cancelar──────────▶ CANCELLED
```

Asistente: `PRESENT` | `ABSENT`. Por ejercicio: pendiente, completado (tiene todas sus series) u omitido.

## Historias de usuario

### HU-004-1 · Planificar sesiones (P1, Must · RF-08)
- **AC-004-01** Puedo crear una sesión con fecha, hora de inicio y fin, entrenador y hasta 4 asistentes (capacidad configurable).
- **AC-004-02** Un cliente no puede estar en dos sesiones que se solapan (409).
- **AC-004-03** Puedo ver las sesiones en una agenda diaria y semanal.

### HU-004-2 · Dirigir la sesión (P1, Must · RF-09, CU-01)
- **AC-004-04** Cuando inicio la sesión, el sistema propone para cada asistente la plantilla siguiente de su rutina activa (AC-003-14)
  y puedo cambiarla antes o durante la sesión.
- **AC-004-05** Al iniciar, se toma una copia de cada plantilla asignada (AC-003-11).
- **AC-004-06** Puedo marcar a un asistente como ausente; deja de mostrarse en las pantallas.
- **AC-004-07** Puedo avanzar al siguiente ejercicio, volver al anterior u omitir uno; el omitido queda registrado.
- **AC-004-08** Cuando finalizo la sesión, deja de mostrarse en las pantallas y sus registros pasan al histórico.
- **AC-004-09** Solo el entrenador asignado o un administrador puede modificar la sesión (403 en otro caso).

### HU-004-3 · Registrar series (P1, Must · RF-10, CU-02)
- **AC-004-10** Para el ejercicio en curso, el panel muestra la siguiente serie con los valores objetivo precargados.
- **AC-004-11** Puedo guardar peso (0–500 kg, paso 0,25), repeticiones (0–100) y, opcionalmente, RPE (1–10).
- **AC-004-12** Guardar una serie ya registrada la corrige (no se duplica: única por asistente, ejercicio y número de serie).
- **AC-004-13** Si falla la red, el panel conserva lo introducido y permite reintentar.

### HU-004-4 · Cambios sobre la marcha (P1, Must · RF-11)
- **AC-004-14** Puedo cambiar la carga objetivo o sustituir el ejercicio en curso de un asistente; solo afecta a esa sesión.

### HU-004-5 · Difusión en tiempo real (P1, Must · RF-13, CU-03)
- **AC-004-15** Cada cambio guardado en la sesión se difunde como `session:updated` con la instantánea completa a la sala `center:{id}`.
- **AC-004-16** Una conexión WebSocket sin JWT válido ni token de pantalla válido se rechaza (RNF-07).
- **AC-004-17** Al conectar o reconectar, el cliente recibe `session:snapshot` con el estado actual.
- **AC-004-18** La instantánea para pantallas solo contiene alias, ejercicio en curso, series, repeticiones, carga, GIF y progreso.
  Nunca correo, teléfono ni medidas corporales.
- **AC-004-19** El panel actualiza su vista de forma optimista y la deshace si la API devuelve error.

## Contratos

Los esquemas `LiveSessionSnapshot`, `SessionUpdatedEvent` y los DTO de las acciones se definen en `packages/shared`.

## Criterios de éxito (RNF-01, RNF-02)

| ID       | Métrica                                                                 | Objetivo |
|----------|-------------------------------------------------------------------------|----------|
| SC-004-1 | Latencia p95 entre la respuesta de la API y la recepción en la pantalla, con 20 conexiones | < 1 s |
| SC-004-2 | Latencia p95 extremo a extremo (clic del entrenador → evento en pantalla) | < 1 s |
| SC-004-3 | Tiempo de reconexión tras corte de red, con recuperación del estado    | < 5 s |

Se miden con el script `pnpm --filter @bloom/api latency` (ver `docs/metricas/README.md`) en el entorno de demostración, ya que el despliegue en AWS queda como diseño objetivo. Los resultados se recogen en la memoria (4.5).
