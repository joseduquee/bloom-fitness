# 002 · Tareas

Rama: `feature/RF-04-importacion-socios` · una PR.

## Contratos
- [x] T201 Esquemas zod en `packages/shared`: socio externo, proveedor, ejecución de importación y listado.
      `externalSource` en el DTO de usuario.

## Backend
- [x] T202 Campos `externalSource`, `externalId`, `externalMissingSince` en `User`, modelo `MemberImport` y migración.
- [x] T203 Puerto `MembersProvider` y error `MembersProviderError`.
- [x] T204 Adaptador `MockMembersProvider` determinista (AC-002-06).
- [x] T205 Adaptador `TimpMembersProvider` con tiempo máximo y validación de la respuesta.
- [x] T206 Variables `MEMBERS_PROVIDER`, `MOCK_MEMBERS_COUNT`, `TIMP_API_URL`, `TIMP_API_KEY` con validación.
- [x] T207 `MemberImportsService`: altas, actualizaciones, omitidos, desactivaciones y errores en una transacción
      (AC-002-01 a AC-002-05). Bloqueo de ejecuciones simultáneas.
- [x] T208 `MemberImportsController`: `POST` y `GET /member-imports`, solo administrador.
- [x] T209 Campos protegidos en `PATCH /users/:id` (AC-002-07, AC-001-13).
- [x] T210 Pruebas: integración de AC-002-01 a AC-002-07, unitarias de los dos adaptadores y de la configuración,
      y rendimiento de 200 socios (SC-002-1).

## Frontend
- [x] T211 Página `/importacion` con proveedor, confirmación, resumen, errores e histórico.
- [x] T212 Insignia **Importado** en el listado y campos de solo lectura en la ficha.
- [x] T213 Pruebas de componentes del resumen y del formulario con campos protegidos.
