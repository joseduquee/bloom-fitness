import { LIVE_NAMESPACE } from '@bloom/shared';
import { io, type Socket } from 'socket.io-client';
import { useSession } from '../features/auth/session-store';
import { API_URL, refreshSession } from './api';

let socket: Socket | null = null;

/**
 * Conexión única al canal en tiempo real (spec 004, PR C). El token se lee en cada intento de
 * conexión, así una reconexión usa el token renovado. Si el servidor lo rechaza por caducado,
 * se renueva una vez y se vuelve a intentar.
 */
export function liveSocket(): Socket {
  if (socket) return socket;
  const created = io(`${API_URL}${LIVE_NAMESPACE}`, {
    autoConnect: false,
    transports: ['websocket'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 2_000,
    auth: (send) => send({ token: useSession.getState().accessToken }),
  });

  let refreshing = false;
  created.on('connect_error', (error) => {
    if (refreshing || !/caducado|iniciado sesión/i.test(error.message)) return;
    refreshing = true;
    void refreshSession()
      .then((ok) => {
        if (ok) created.connect();
      })
      .finally(() => {
        refreshing = false;
      });
  });

  socket = created;
  return created;
}

/** Al cerrar sesión se corta la conexión para que no siga recibiendo datos. */
export function closeLiveSocket(): void {
  socket?.disconnect();
  socket = null;
}
