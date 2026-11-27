# Métricas de latencia del canal en tiempo real

Resultados de `apps/api/scripts/measure-latency.ts` para los criterios de éxito de la spec 004.

## Cómo se ejecuta

Con la base de datos cargada (`pnpm db:seed`) y el API arrancado (`pnpm dev`):

```bash
pnpm --filter @bloom/api latency
# Opciones: --url, --clients (20), --updates (200), --interval (250 ms), --reconnections (10)
pnpm --filter @bloom/api latency -- --url https://mi-api.ejemplo.com --clients 20 --updates 200
```

Cada ejecución guarda un `latencia-<fecha>.json` en esta carpeta y termina con código 0 si se cumplen los
tres objetivos.

## Qué mide

1. Inicia sesión como entrenador, programa una sesión en una franja libre de 2030 con los clientes de
   demostración y la inicia.
2. Abre `--clients` conexiones Socket.IO: la mitad como panel (`session:subscribe`) y la otra mitad como
   pantalla (`screen:subscribe`).
3. Envía `--updates` series por REST, una cada `--interval` ms. Para cada serie y cada conexión anota:
   - **Extremo a extremo** (SC-004-2): desde que se envía la petición hasta que la conexión recibe la
     instantánea con esa revisión. Es lo que ve el cliente en la sala.
   - **Tras la respuesta del API** (SC-004-1): desde que llega la respuesta REST hasta el evento. Suele ser 0,
     porque el evento se difunde antes de responder.
   - Eventos que no llegan en 5 s (perdidos).
4. Corta `--reconnections` veces la conexión de un cliente (como si cayera la red) y mide cuánto tarda en
   reconectar, volver a suscribirse y tener la instantánea actual (SC-004-3).
5. Finaliza la sesión de prueba.

Todas las conexiones corren en el mismo proceso, así que comparten reloj y no hace falta sincronizarlo.

## Limitaciones

- Ejecutado en local, cliente y servidor están en la misma máquina: no hay latencia de red real. Para un
  resultado más representativo se ejecuta contra el entorno de demostración desplegado (`--url`).
- Las conexiones son clientes Node, no navegadores: no incluye el tiempo de pintado de la pantalla.
