# 003 · Tareas

## PR A · Catálogo de ejercicios

Rama: `feature/RF-05-catalogo-ejercicios`

- [x] T301 Enumeraciones y esquemas zod de ejercicios en `packages/shared`.
- [x] T302 Modelo `Exercise` y migración.
- [x] T303 Puerto `MediaStorage` y adaptador local; los archivos se sirven en `/media/`.
- [x] T304 `ExercisesService` y `ExercisesController`: alta, edición, búsqueda, filtros, desactivación (AC-003-01, AC-003-03 a AC-003-05).
- [x] T305 Subida del GIF con límite de 5 MB y comprobación de la firma (AC-003-02).
- [x] T306 Catálogo inicial de 34 ejercicios en el `seed` (AC-003-06).
- [x] T307 Pruebas de integración de AC-003-01 a AC-003-06 y unitarias del adaptador y de la validación del GIF.
- [x] T308 Página `/ejercicios` con tabla, búsqueda, filtros y diálogo de alta y edición con el GIF.
- [x] T309 Pruebas de componentes del catálogo.

## PR B · Plantillas y rutinas

Rama: `feature/RF-06-plantillas-rutinas`

- [x] T310 Esquemas zod de plantillas y rutinas.
- [x] T311 Modelos `WorkoutTemplate`, `TemplateExercise`, `Routine`, `RoutineTemplate` y migración.
- [x] T312 Plantillas: alta, edición con reordenación, duplicado (AC-003-07 a AC-003-10).
- [x] T313 Rutinas: alta, edición, activación exclusiva por cliente (AC-003-12, AC-003-13).
- [x] T314 Función de rotación de plantillas con pruebas unitarias (AC-003-14). Se conecta a la última sesión en la spec 004.
- [x] T315 Pantallas de plantillas y de rutinas en la ficha del cliente.
- [x] T316 Pruebas de integración y de componentes.

## Pendiente para la spec 004

- AC-003-11: al crear una sesión se copian los ejercicios de la plantilla; editar la plantilla después no la altera.
- AC-003-14: la sesión guarda la posición de la rutina que se ha usado y la siguiente se calcula con `nextRoutinePosition`.
