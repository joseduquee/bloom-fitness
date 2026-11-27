/* eslint-disable no-console -- script de línea de comandos: su salida es la consola */
/**
 * Medición de latencia y reconexión del canal en tiempo real (spec 004, SC-004-1 a SC-004-3).
 *
 * Simula una sesión real: un entrenador registra series por REST y N clientes conectados por WebSocket
 * (paneles y pantallas) reciben cada cambio. Para cada cambio y cada cliente mide el tiempo desde que
 * el entrenador envía la serie hasta que ese cliente recibe la instantánea con esa revisión.
 * Todos los clientes corren en este proceso, así que comparten reloj y no hace falta sincronizarlo.
 *
 * Uso (con el API arrancado y el seed cargado):
 *   pnpm --filter @bloom/api latency
 *   pnpm --filter @bloom/api latency -- --url https://api.ejemplo.com --clients 20 --updates 200
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { io, type Socket } from 'socket.io-client';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3000' },
    email: { type: 'string', default: 'entrenador@bloom.test' },
    password: { type: 'string', default: 'BloomCoach2026!' },
    clients: { type: 'string', default: '20' },
    updates: { type: 'string', default: '200' },
    interval: { type: 'string', default: '250' },
    reconnections: { type: 'string', default: '10' },
    // Se ejecuta desde apps/api (pnpm --filter), así que la carpeta queda en docs/metricas del repo.
    out: { type: 'string', default: resolve(process.cwd(), '../../docs/metricas') },
  },
});

const API = args.url.replace(/\/+$/, '');
const CLIENTS = Number(args.clients);
const UPDATES = Number(args.updates);
const INTERVAL_MS = Number(args.interval);
const RECONNECTIONS = Number(args.reconnections);
const TIMEOUT_MS = 5_000;

interface Snapshot {
  id: string;
  revision: number;
  attendees: { client: { id: string }; exercises: { position: number; sets: number }[] }[];
}

async function api<T>(
  path: string,
  token: string | null,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) {
    throw new Error(
      `${init.method ?? 'GET'} ${path} → ${response.status}: ${await response.text()}`,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)] as number;
}

function stats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / (sorted.length || 1);
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    count: sorted.length,
    mean: round(mean),
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    p99: round(percentile(sorted, 99)),
    max: round(sorted.at(-1) ?? Number.NaN),
  };
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** Programa una sesión en una franja libre y la inicia con la primera plantilla para todos. */
async function prepareSession(token: string): Promise<Snapshot> {
  const clients = await api<{ items: { id: string }[] }>(
    '/users?role=CLIENT&status=ACTIVE&pageSize=4',
    token,
  );
  const templates = await api<{ items: { id: string }[] }>('/templates?pageSize=1', token);
  const template = templates.items[0];
  if (clients.items.length === 0 || !template) {
    throw new Error('Faltan clientes o plantillas. Ejecuta antes `pnpm db:seed`.');
  }
  // Una franja aleatoria en 2030 para no chocar con sesiones reales ni con mediciones anteriores.
  const start = new Date(Date.UTC(2030, 0, 1) + Math.floor(Math.random() * 300 * 24) * 3_600_000);
  const session = await api<{ id: string }>('/sessions', token, {
    method: 'POST',
    body: {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      clientIds: clients.items.map((client) => client.id),
      notes: 'Sesión creada por el script de medición de latencia',
    },
  });
  return api<Snapshot>(`/sessions/${session.id}/start`, token, {
    method: 'POST',
    body: {
      assignments: clients.items.map((client) => ({
        clientId: client.id,
        templateId: template.id,
      })),
    },
  });
}

interface Listener {
  socket: Socket;
  kind: 'panel' | 'pantalla';
  /** Momento (performance.now) en que llegó cada revisión. */
  received: Map<number, number>;
}

function connectListener(
  token: string,
  sessionId: string,
  kind: Listener['kind'],
): Promise<Listener> {
  const socket = io(`${API}/live`, {
    auth: { token },
    transports: ['websocket'],
    reconnectionDelay: 250,
    reconnectionDelayMax: 1_000,
  });
  const listener: Listener = { socket, kind, received: new Map() };
  const subscribeEvent = kind === 'panel' ? 'session:subscribe' : 'screen:subscribe';
  const updateEvent = kind === 'panel' ? 'session:updated' : 'screen:session';
  socket.on(updateEvent, (payload: { revision: number }) => {
    if (!listener.received.has(payload.revision))
      listener.received.set(payload.revision, performance.now());
  });
  // Cada vez que conecta (también al reconectar) vuelve a suscribirse.
  socket.on('connect', () => {
    void socket.emitWithAck(subscribeEvent, { sessionId });
  });
  return new Promise((done, fail) => {
    socket.once('connect', () => done(listener));
    socket.once('connect_error', (error) => fail(error));
  });
}

async function main() {
  console.log(`API: ${API} · ${CLIENTS} conexiones · ${UPDATES} cambios cada ${INTERVAL_MS} ms\n`);
  const { accessToken } = await api<{ accessToken: string }>('/auth/login', null, {
    method: 'POST',
    body: { email: args.email, password: args.password },
  });

  const session = await prepareSession(accessToken);
  const attendee = session.attendees.find((a) => a.exercises.length > 0);
  if (!attendee) throw new Error('La plantilla no tiene ejercicios.');
  const exercise = attendee.exercises[0] as { position: number; sets: number };
  console.log(`Sesión de prueba: ${session.id}`);

  // Mitad paneles y mitad pantallas, como en la sala.
  const listeners = await Promise.all(
    Array.from({ length: CLIENTS }, (_, index) =>
      connectListener(accessToken, session.id, index % 2 === 0 ? 'panel' : 'pantalla'),
    ),
  );
  await sleep(500);

  // SC-004-1 y SC-004-2: latencia extremo a extremo de cada cambio a cada conexión.
  const latencies: number[] = [];
  const afterResponse: number[] = [];
  const restTimes: number[] = [];
  let lost = 0;
  for (let i = 0; i < UPDATES; i++) {
    const setNumber = (i % exercise.sets) + 1;
    const sentAt = performance.now();
    const snapshot = await api<Snapshot>(
      `/sessions/${session.id}/attendees/${attendee.client.id}/exercises/${exercise.position}/sets/${setNumber}`,
      accessToken,
      { method: 'PUT', body: { weightKg: 40 + (i % 8) * 2.5, reps: 8 + (i % 4) } },
    );
    const respondedAt = performance.now();
    restTimes.push(respondedAt - sentAt);
    const deadline = performance.now() + TIMEOUT_MS;
    while (
      listeners.some((l) => !l.received.has(snapshot.revision)) &&
      performance.now() < deadline
    ) {
      await sleep(2);
    }
    for (const listener of listeners) {
      const at = listener.received.get(snapshot.revision);
      if (at === undefined) lost += 1;
      else {
        latencies.push(at - sentAt);
        // El evento suele llegar antes que la propia respuesta REST: entonces cuenta como 0.
        afterResponse.push(Math.max(0, at - respondedAt));
      }
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${UPDATES} cambios`);
    await sleep(INTERVAL_MS);
  }

  // SC-004-3: se corta la conexión de un cliente y se mide cuánto tarda en volver a tener datos.
  const reconnections: number[] = [];
  for (let i = 0; i < RECONNECTIONS; i++) {
    const listener = listeners[i % listeners.length] as Listener;
    const cutAt = performance.now();
    const back = new Promise<number>((done) => {
      const event = listener.kind === 'panel' ? 'session:snapshot' : 'screen:session';
      listener.socket.once(event, () => done(performance.now() - cutAt));
    });
    // Cierra el transporte como si se cayera la red; Socket.IO reconecta solo.
    listener.socket.io.engine.close();
    reconnections.push(await Promise.race([back, sleep(TIMEOUT_MS * 2).then(() => Number.NaN)]));
    await sleep(300);
  }

  for (const listener of listeners) listener.socket.disconnect();
  await api(`/sessions/${session.id}/finish`, accessToken, { method: 'POST' });

  const result = {
    fecha: new Date().toISOString(),
    api: API,
    conexiones: CLIENTS,
    cambios: UPDATES,
    intervaloMs: INTERVAL_MS,
    latenciaExtremoAExtremoMs: stats(latencies),
    latenciaTrasRespuestaApiMs: stats(afterResponse),
    perdidos: lost,
    respuestaRestMs: stats(restTimes),
    reconexionMs: stats(reconnections.filter((value) => !Number.isNaN(value))),
    reconexionesFallidas: reconnections.filter((value) => Number.isNaN(value)).length,
    objetivos: {
      'SC-004-1 p95 tras la respuesta del API < 1000 ms': stats(afterResponse).p95 < 1000,
      'SC-004-2 p95 extremo a extremo < 1000 ms, 20 conexiones, sin pérdidas':
        stats(latencies).p95 < 1000 && lost === 0 && CLIENTS >= 20,
      'SC-004-3 reconexión < 5000 ms':
        reconnections.length > 0 && reconnections.every((value) => value < 5000),
    },
  };

  console.log('\nLatencia del cambio hasta cada conexión (ms):');
  console.table({
    'Extremo a extremo': result.latenciaExtremoAExtremoMs,
    'Tras la respuesta del API': result.latenciaTrasRespuestaApiMs,
    'Respuesta REST': result.respuestaRestMs,
    Reconexión: result.reconexionMs,
  });
  console.log('Eventos perdidos:', lost);
  console.table(result.objetivos);

  await mkdir(args.out, { recursive: true });
  const stamp = result.fecha.replace(/[:.]/g, '-');
  const file = resolve(args.out, `latencia-${stamp}.json`);
  await writeFile(file, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`\nResultado guardado en ${file}`);
  process.exit(Object.values(result.objetivos).every(Boolean) ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
