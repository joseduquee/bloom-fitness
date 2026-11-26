# 003 · Plan técnico

La spec se entrega en dos PR para que cada una se pueda revisar y probar por separado:

| PR | Contenido | Requisitos | Criterios |
|----|-----------|------------|-----------|
| A  | Catálogo de ejercicios y almacenamiento de GIF | RF-05 | AC-003-01 a AC-003-06 |
| B  | Plantillas y rutinas | RF-06, RF-07 | AC-003-07 a AC-003-10, AC-003-12 a AC-003-14 |

AC-003-11 (la sesión trabaja con una copia de la plantilla) se implementa en la spec 004, al crear la sesión.
La función que propone la siguiente plantilla (AC-003-14) se entrega y prueba en la PR B; en la 004 se le pasa la
última sesión real del cliente.

## Modelo de datos

```prisma
enum MuscleGroup { CHEST BACK SHOULDERS BICEPS TRICEPS CORE QUADRICEPS HAMSTRINGS GLUTES CALVES FULL_BODY CARDIO }
enum Equipment   { BODYWEIGHT BARBELL DUMBBELL KETTLEBELL MACHINE CABLE BAND OTHER }
enum Difficulty  { BEGINNER INTERMEDIATE ADVANCED }

model Exercise {                       // PR A
  id, centerId, name, primaryMuscle, equipment, difficulty
  instructions String?
  mediaKey     String?                 // clave del GIF en el almacenamiento
  isActive     Boolean @default(true)
  @@unique([centerId, name])
}

model WorkoutTemplate {                // PR B
  id, centerId, name, goal?, createdById?
  items TemplateExercise[]
}

model TemplateExercise {               // PR B
  id, templateId, exerciseId, position
  sets          Int                    // 1–10
  reps          String                 // texto corto: "8-10", "12", "30 s"
  targetLoadKg  Decimal? @db.Decimal(6, 2)
  restSeconds   Int
  notes         String?
  @@unique([templateId, position])
}

model Routine {                        // PR B
  id, centerId, clientId, name, goal?, startsOn @db.Date, endsOn? @db.Date, isActive, createdById?
  templates RoutineTemplate[]
}

model RoutineTemplate {                // PR B
  routineId, templateId, position
  @@id([routineId, position])
}
```

El nombre del ejercicio es único en el centro sin distinguir mayúsculas: el servicio lo comprueba con una consulta
insensible a mayúsculas y la restricción única de la base de datos actúa como respaldo (AC-003-03).

## Almacenamiento de los GIF (AC-003-02)

Puerto `MediaStorage` con el mismo patrón que la importación de socios:

```ts
interface MediaStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
```

- **Local** (`LocalDiskMediaStorage`): guarda en `MEDIA_DIR` (`apps/api/uploads`, fuera del repositorio) y el API
  sirve los archivos en `/media/`. Es el adaptador que se usa en desarrollo, en las pruebas y en la demostración.
- **AWS** (diseño objetivo, no desplegado): un adaptador `S3MediaStorage` con `PutObject` y `DeleteObject` sobre un
  bucket privado, servido por CloudFront con Origin Access Control. Solo cambia el adaptador y la variable
  `MEDIA_PUBLIC_URL`, que pasaría a ser la URL de CloudFront.

Validaciones de la subida:

- Tamaño máximo de 5 MB, limitado ya en la recepción para no cargar en memoria archivos mayores (413).
- Tipo comprobado por la firma del archivo (`GIF87a` o `GIF89a`), no por la extensión ni por el `Content-Type`
  que envía el navegador (415).
- Clave aleatoria (`exercises/{uuid}.gif`): el nombre original no se usa nunca.
- Al reemplazar o quitar un GIF se borra el anterior.

Los GIF se sirven sin autenticación porque la pantalla de sala los carga directamente y no contienen datos
personales. Las claves son UUID, así que no se pueden enumerar.

## API de ejercicios (PR A)

| Método y ruta                      | Acceso           | Descripción |
|------------------------------------|------------------|-------------|
| `GET /exercises`                   | ADMIN, TRAINER   | Búsqueda por nombre, filtro por músculo y equipamiento, paginado. Por defecto solo activos |
| `GET /exercises/:id`               | ADMIN, TRAINER   | Detalle, aunque esté desactivado |
| `POST /exercises`                  | ADMIN, TRAINER   | Alta (201). 409 si el nombre existe |
| `PATCH /exercises/:id`             | ADMIN, TRAINER   | Edición. 409 si el nombre existe |
| `POST /exercises/:id/deactivate`   | ADMIN, TRAINER   | Lo oculta del catálogo (AC-003-04) |
| `POST /exercises/:id/reactivate`   | ADMIN, TRAINER   | Lo vuelve a mostrar |
| `PUT /exercises/:id/media`         | ADMIN, TRAINER   | Sube o reemplaza el GIF (`multipart/form-data`, campo `file`) |
| `DELETE /exercises/:id/media`      | ADMIN, TRAINER   | Quita el GIF |

Entrenadores y administradores gestionan el catálogo, que es común a todo el centro.

## API de plantillas y rutinas (PR B)

| Método y ruta                          | Acceso         | Descripción |
|----------------------------------------|----------------|-------------|
| `GET /templates`                       | ADMIN, TRAINER | Listado con búsqueda y número de ejercicios |
| `GET /templates/:id`                   | ADMIN, TRAINER | Detalle con los ejercicios en orden |
| `POST /templates`                      | ADMIN, TRAINER | Alta (201) |
| `PUT /templates/:id`                   | ADMIN, TRAINER | Sustituye datos y lista de ejercicios: así se reordena, añade y quita (AC-003-09) |
| `POST /templates/:id/duplicate`        | ADMIN, TRAINER | Copia con el sufijo «(copia)» (AC-003-10) |
| `DELETE /templates/:id`                | ADMIN, TRAINER | 204; 409 si alguna rutina la usa |
| `GET /clients/:clientId/routines`      | ADMIN, TRAINER | Rutinas del cliente, la activa primero |
| `POST /clients/:clientId/routines`     | ADMIN, TRAINER | Alta; `activate` (por defecto `true`) desactiva la anterior (AC-003-13) |
| `GET /routines/:id`, `PUT /routines/:id` | ADMIN, TRAINER | Detalle y edición |
| `POST /routines/:id/activate`, `/deactivate` | ADMIN, TRAINER | Activación exclusiva por cliente |

Reglas:

- Una plantilla solo admite ejercicios del centro. Uno desactivado se rechaza (422) salvo que la plantilla ya lo
  tuviera: así una plantilla antigua se puede seguir editando (AC-003-04).
- Las claves foráneas usan `Restrict`: un ejercicio usado en una plantilla no se borra (solo se desactiva) y una
  plantilla usada en una rutina no se puede eliminar (409).
- La activación exclusiva se hace en una transacción: primero se desactivan las demás rutinas del cliente y después
  se activa la elegida. No hay índice parcial en la base de datos porque Prisma no lo expresa en el esquema; con
  un único API y transacciones es suficiente para el alcance del TFT.
- Las fechas de la rutina son columnas `DATE` y viajan como `YYYY-MM-DD`, sin hora ni zona horaria.
- Cada módulo usa los servicios de los demás y no sus tablas (constitución §2.4): las plantillas piden los
  ejercicios a `ExercisesService` y las rutinas validan al cliente con `UsersService` y las plantillas con
  `TemplatesService`.

## Variables de entorno nuevas

| Variable           | Valor por defecto              | Notas |
|--------------------|--------------------------------|-------|
| `MEDIA_DIR`        | `uploads`                      | Carpeta local, relativa a `apps/api` |
| `MEDIA_PUBLIC_URL` | `http://localhost:3000/media`  | En AWS sería la URL de CloudFront |

## Frontend (PR A)

- Entrada de menú **Ejercicios** para administradores y entrenadores (`/ejercicios`).
- Tabla con miniatura del GIF, nombre, músculo, equipamiento y dificultad. Búsqueda, filtros por músculo y
  equipamiento y opción para mostrar los desactivados.
- Diálogo para crear y editar con vista previa del GIF, reemplazo, eliminación y botón para desactivar.
- Si no hay GIF se muestra un icono en su lugar.

## Datos de ejemplo (AC-003-06)

El `seed` carga 34 ejercicios con nombre, músculo, equipamiento, dificultad e instrucciones. Se ejecuta varias
veces sin duplicar. No incluye GIF: el entrenador los sube desde la aplicación, y así no se reparten animaciones
con derechos de terceros dentro del repositorio.
