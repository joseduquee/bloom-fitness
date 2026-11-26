# Especificaciones de Bloom Fitness v1.0

El desarrollo sigue un enfoque guiado por especificaciones (*spec-driven development*).
Antes de escribir código, cada funcionalidad se describe en su carpeta con tres documentos:

| Documento  | Contenido                                                                 |
|------------|---------------------------------------------------------------------------|
| `spec.md`  | Qué se construye y por qué: historias de usuario, criterios de aceptación (Dado-Cuando-Entonces), requisitos trazados a la memoria y criterios de éxito. |
| `plan.md`  | Cómo se construye: decisiones técnicas, modelo de datos, contratos de API y eventos. |
| `tasks.md` | Lista ordenada de tareas, cada una pensada para una rama y una *pull request*. |

`plan.md` y `tasks.md` se escriben al empezar la iteración correspondiente, no antes.

## Funcionalidades e iteraciones

| Carpeta                                | Iteración | Requisitos de la memoria                  |
|----------------------------------------|-----------|-------------------------------------------|
| `000-plataforma`                       | 0         | RNF-06, RNF-09, RNF-11, RNF-13, OE7       |
| `001-autenticacion-usuarios`           | 1         | RF-01, RF-02, RF-03, RF-16, RNF-06, RNF-07 |
| `002-importacion-socios`               | 1         | RF-04, RNF-08, RNF-12                     |
| `003-ejercicios-plantillas-rutinas`    | 2         | RF-05, RF-06, RF-07                       |
| `004-sesiones-en-directo`              | 3         | RF-08, RF-09, RF-10, RF-11, RF-13, RNF-01, RNF-02, RNF-07 |
| `005-pantallas-historico-cliente`      | 4         | RF-12, RF-14, RF-15, RNF-03, RNF-04, RNF-05 |

Las normas comunes a todas las funcionalidades están en [`constitution.md`](./constitution.md).

## Trazabilidad

- Cada *issue* y cada rama llevan el identificador del requisito: `feature/RF-09-sesion-en-directo`.
- Cada criterio de aceptación tiene un identificador (`AC-004-03`) que se cita en el nombre de la prueba que lo verifica.
- La versión evaluada en el TFT corresponde a la etiqueta `v1.0.0`.
