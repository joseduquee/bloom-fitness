# 002 · Importación de socios desde un proveedor externo

**Iteración:** 1 · **Prioridad:** Should · **Requisitos:** RF-04, RNF-08, RNF-12 · **Caso de uso:** CU-04

## Contexto

El centro ya gestiona a sus socios en otro programa (TIMP en el caso de estudio). Para no darlos de alta dos veces,
Bloom Fitness los importa. La integración se aísla tras un puerto para poder cambiar de proveedor.

## Historias de usuario

### HU-002-1 · Importar socios (P1)
Como administrador, quiero importar los socios del proveedor configurado.
- **AC-002-01** Dado el proveedor configurado, cuando lanzo la importación, entonces se crean como `CLIENT` los socios nuevos
  y se actualizan los existentes, identificados por `externalId`.
- **AC-002-02** Al terminar, recibo un resumen con altas, actualizaciones, omitidos y errores.
- **AC-002-03** Ejecutar dos veces la importación sin cambios en el proveedor no crea duplicados (idempotencia).
- **AC-002-04** Si el proveedor no responde o devuelve error, entonces no se modifica ningún dato y se informa del fallo.
- **AC-002-05** Un socio que desaparece del proveedor no se borra: se marca como inactivo.

### HU-002-2 · Datos simulados (P1)
- **AC-002-06** Con `MEMBERS_PROVIDER=mock`, la importación usa un proveedor que devuelve socios ficticios deterministas.
  Es el valor por defecto en desarrollo, pruebas y demostraciones.

### HU-002-3 · Campos protegidos (P2)
- **AC-002-07** En un usuario importado, nombre, apellidos y correo se muestran como de solo lectura y la API rechaza su modificación (422).

## Diseño requerido

- Interfaz `MembersProvider` (`fetchMembers(): Promise<ExternalMember[]>`) en el dominio.
- Adaptadores `MockMembersProvider` y `TimpMembersProvider`. Se elige con la variable `MEMBERS_PROVIDER`.
- Solo se importan los campos mínimos: identificador externo, nombre, apellidos y correo (minimización de datos, RGPD).

## Criterios de éxito

| ID       | Métrica                                      | Objetivo |
|----------|----------------------------------------------|----------|
| SC-002-1 | Importación de 200 socios simulados          | < 5 s    |
