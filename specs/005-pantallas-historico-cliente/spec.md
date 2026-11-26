# 005 · Pantallas de sala, histórico y área del cliente

**Iteración:** 4 · **Requisitos:** RF-12, RF-13, RF-14, RF-15, RNF-03, RNF-04, RNF-05

## Historias de usuario

### HU-005-1 · Emparejar una pantalla (P1, Must · RF-12)
- **AC-005-01** Como administrador doy de alta una pantalla (nombre) y obtengo un código de 6 caracteres válido 10 minutos y de un solo uso.
- **AC-005-02** En el televisor abro `/tv`, introduzco el código y la pantalla recibe un token de dispositivo que guarda en el navegador.
- **AC-005-03** Un código caducado o ya usado se rechaza.
- **AC-005-04** Puedo revocar una pantalla; su conexión se cierra y vuelve a pedir código.

### HU-005-2 · Vista de pantalla de sala (P1, Must · RF-13)
- **AC-005-05** Sin sesión en curso, la pantalla muestra un modo de espera con el nombre del centro y la hora.
- **AC-005-06** Con sesión en curso, muestra una tarjeta por asistente presente: alias, ejercicio, GIF, serie actual / total, repeticiones y carga.
- **AC-005-07** Las tarjetas se reparten para 1–4 asistentes sin desbordar en pantallas de 1920×1080.
- **AC-005-08** El texto principal mide al menos 48 px y el contraste cumple WCAG AA (legible a 4 m, RNF-04).
- **AC-005-09** Si se pierde la conexión, muestra un aviso discreto y se reconecta sola (RNF-02).

### HU-005-3 · Histórico del cliente (P1, Must · RF-14)
- **AC-005-10** Como entrenador o como el propio cliente, veo las sesiones realizadas con sus ejercicios y series.
- **AC-005-11** Para un ejercicio, veo un gráfico de la evolución de la carga máxima y del volumen (series × repeticiones × carga) por sesión.
- **AC-005-12** Un cliente solo puede ver su propio histórico (404 para el resto).

### HU-005-4 · Área del cliente (P2, Should · RF-15)
- **AC-005-13** El cliente ve su rutina activa con sus plantillas y la próxima plantilla prevista.
- **AC-005-14** El cliente ve sus próximas sesiones.

## Criterios de éxito

| ID       | Métrica                                             | Objetivo                    |
|----------|-----------------------------------------------------|-----------------------------|
| SC-005-1 | Lighthouse (rendimiento y accesibilidad), vistas principales | ≥ 90 (deseable)    |
| SC-005-2 | Core Web Vitals (LCP, INP, CLS)                     | ≤ 2,5 s · ≤ 200 ms · ≤ 0,1 (deseable) |
| SC-005-3 | Errores axe de nivel A/AA                           | 0 (deseable)                |
| SC-005-4 | SUS con entrenadores                                | ≥ 68, más entrevista        |
