# 003 · Ejercicios, plantillas y rutinas

**Iteración:** 2 · **Requisitos:** RF-05, RF-06, RF-07

## Contexto

Es la parte que sustituye a la hoja de cálculo: el entrenador define una vez los ejercicios y las plantillas
y las combina en la rutina de cada cliente.

## Conceptos

- **Ejercicio**: movimiento del catálogo (por ejemplo, sentadilla con barra) con su demostración en GIF.
- **Plantilla**: entrenamiento de un día. Lista ordenada de ejercicios, cada uno con series, repeticiones, carga objetivo y descanso.
  Es reutilizable entre clientes.
- **Rutina**: plan de un cliente para un periodo. Tiene un objetivo y una secuencia ordenada de plantillas (día A, día B…).
  Solo puede haber una rutina activa por cliente.

## Historias de usuario

### HU-003-1 · Catálogo de ejercicios (P1, Must · RF-05)
- **AC-003-01** Puedo crear un ejercicio con nombre, músculo principal, equipamiento, dificultad, instrucciones y GIF.
- **AC-003-02** El GIF se sube a almacenamiento de objetos (S3 en producción, disco en local), máximo 5 MB, y se valida el tipo.
- **AC-003-03** El nombre es único dentro del centro (409 si se repite).
- **AC-003-04** Desactivar un ejercicio lo oculta del catálogo, pero las plantillas y el histórico que lo usan siguen funcionando.
- **AC-003-05** El catálogo admite búsqueda por nombre y filtro por músculo y equipamiento.
- **AC-003-06** El `seed` carga un catálogo inicial de al menos 30 ejercicios.

### HU-003-2 · Plantillas (P1, Must · RF-06)
- **AC-003-07** Puedo crear una plantilla con nombre, objetivo y una lista ordenada de ejercicios.
- **AC-003-08** Para cada ejercicio indico series (1–10), repeticiones (texto corto, p. ej. `8-10`), carga objetivo opcional en kg y descanso en segundos.
- **AC-003-09** Puedo reordenar, añadir y quitar ejercicios; el orden se guarda.
- **AC-003-10** Puedo duplicar una plantilla.
- **AC-003-11** Si una plantilla se está usando en una sesión en curso, editarla no altera esa sesión (la sesión trabaja con una copia).

### HU-003-3 · Rutinas (P1, Must · RF-07)
- **AC-003-12** Puedo asignar a un cliente una rutina con nombre, objetivo, fecha de inicio, fecha de fin opcional y plantillas ordenadas.
- **AC-003-13** Al activar una rutina, la anterior activa del mismo cliente pasa a inactiva.
- **AC-003-14** El sistema propone la siguiente plantilla de la rutina según la última sesión realizada por el cliente (rotación A → B → C → A).

## Criterios de éxito

| ID       | Métrica                                                    | Objetivo |
|----------|------------------------------------------------------------|----------|
| SC-003-1 | Crear una plantilla de 6 ejercicios (prueba con entrenadores) | < 3 min  |
