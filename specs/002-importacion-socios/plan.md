# 002 · Plan técnico

## Arquitectura: puerto y adaptadores

La importación no conoce a TIMP. Depende de un puerto y el adaptador concreto se elige al arrancar:

```
MemberImportsService ──► MembersProvider (puerto)
                              ▲            ▲
                MockMembersProvider   TimpMembersProvider
                 (MEMBERS_PROVIDER=mock)  (MEMBERS_PROVIDER=timp)
```

```ts
interface MembersProvider {
  readonly source: 'mock' | 'timp';
  fetchMembers(): Promise<ExternalMember[]>;   // lanza MembersProviderError si falla
}

interface ExternalMember { externalId: string; firstName: string; lastName: string; email: string }
```

Solo viajan cuatro campos (minimización de datos, RNF-08). Cambiar de proveedor supone escribir un adaptador
nuevo y añadir un valor a `MEMBERS_PROVIDER`; el resto del código no cambia (RNF-12).

### Adaptador simulado

Genera socios ficticios **deterministas** a partir de listas fijas de nombres y apellidos: la misma configuración
produce siempre los mismos socios (AC-002-06). El número se configura con `MOCK_MEMBERS_COUNT` (30 por defecto).
Los correos usan el dominio reservado `socios.bloom.test`, que nunca puede pertenecer a una persona real.

### Adaptador TIMP

Adaptador HTTP de referencia: `GET {TIMP_API_URL}/members` con `Authorization: Bearer {TIMP_API_KEY}`, tiempo
máximo de 10 s y validación de la respuesta con zod. El contrato exacto de TIMP no es público; si se integrara
de verdad, solo cambiaría el mapeo dentro de este adaptador. En el TFT no se usa con datos reales.

## Modelo de datos

```prisma
model User {
  ...
  externalSource       String?    // 'mock' | 'timp'; null si se dio de alta a mano
  externalId           String?    // identificador en el proveedor
  externalMissingSince DateTime?  // fecha en que dejó de aparecer en el proveedor

  @@unique([centerId, externalSource, externalId])
}

enum ImportStatus { SUCCEEDED FAILED }

model MemberImport {          // registro de cada ejecución (auditoría y pantalla de histórico)
  id, centerId, triggeredById?, source, status
  startedAt, finishedAt
  createdCount, updatedCount, unchangedCount, deactivatedCount, errorCount
  errors        Json       // [{ externalId, message }], como máximo 100
  failureReason String?
}
```

## Algoritmo de importación

1. Se pide la lista al proveedor. Si falla, se guarda la ejecución como `FAILED`, se responde **502** y no se toca
   ningún usuario (AC-002-04).
2. Se valida cada socio con zod. Los inválidos y los `externalId` repetidos van a errores, pero cuentan como
   "presentes" para no desactivarlos por un fallo de formato.
3. Se cargan en memoria los usuarios del centro con ese origen y los que comparten correo con algún socio.
4. Se decide cada caso:

| Situación                                                   | Resultado        |
|-------------------------------------------------------------|------------------|
| `externalId` nuevo y correo libre                           | Alta como `CLIENT`, pendiente de activar |
| `externalId` nuevo y correo ya usado por otro usuario       | Error (no se vincula: podría ser un administrador) |
| `externalId` conocido con nombre, apellidos o correo distintos | Actualización |
| `externalId` conocido que había desaparecido y vuelve        | Reactivación (cuenta como actualización) |
| `externalId` conocido sin cambios                           | Sin cambios (omitido) |
| Usuario importado activo que ya no está en el proveedor     | Desactivación y cierre de sus sesiones (AC-002-05) |

5. Todas las escrituras van en **una transacción**: o se aplican todas o ninguna.
6. Se guarda la ejecución como `SUCCEEDED` con el resumen (AC-002-02).

Una desactivación hecha a mano por el administrador no se deshace en la siguiente importación: solo se reactiva
a quien desactivó la propia importación (`externalMissingSince` no nulo).

Dos importaciones a la vez en el mismo centro responden **409**. El bloqueo es en memoria, válido para una sola
instancia del API (misma limitación que el límite de intentos de la spec 001).

## Campos protegidos (AC-002-07 y AC-001-13)

`PATCH /users/:id` sobre un usuario importado responde **422** si intenta cambiar nombre, apellidos o correo.
Enviar el mismo valor que ya tiene no es un cambio y se acepta, así el formulario puede mandar todos sus campos.
El alias y el rol sí se pueden editar. El DTO de usuario incluye `externalSource` para que la web lo sepa.

## API

| Método y ruta           | Acceso | Descripción |
|-------------------------|--------|-------------|
| `POST /member-imports`  | ADMIN  | Lanza una importación y devuelve su resumen (201). 502 si falla el proveedor, 409 si hay otra en curso |
| `GET /member-imports`   | ADMIN  | Proveedor configurado y últimas 10 ejecuciones |

## Variables de entorno nuevas

| Variable             | Valor por defecto | Notas |
|----------------------|-------------------|-------|
| `MEMBERS_PROVIDER`   | `mock`            | `mock` o `timp` |
| `MOCK_MEMBERS_COUNT` | `30`              | Entre 0 y 1000 |
| `TIMP_API_URL`       | —                 | Obligatoria si `MEMBERS_PROVIDER=timp` |
| `TIMP_API_KEY`       | —                 | Obligatoria si `MEMBERS_PROVIDER=timp`. Nunca se versiona |

## Frontend

- Nueva entrada de menú **Importación** (solo administrador) con la ruta `/importacion`.
- Muestra el proveedor configurado, un botón para importar con diálogo de confirmación (explica que se
  desactivará a quien ya no esté), el resumen de la última ejecución con sus errores y una tabla con el histórico.
- En el listado de usuarios, los importados llevan la insignia **Importado**.
- En la ficha, nombre, apellidos y correo aparecen deshabilitados con una nota que indica dónde se modifican.
