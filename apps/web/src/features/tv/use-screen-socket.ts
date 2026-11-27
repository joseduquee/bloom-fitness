import { LIVE_NAMESPACE, LiveEvents, type ScreenSession, type ScreenState } from '@bloom/shared';
import { useEffect, useReducer } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../../lib/api';
import { initialTvState, tvReducer, type TvState } from './tv-state';

/**
 * Conexión de la pantalla con su token de dispositivo. Se reconecta sola (AC-005-09); si el servidor
 * dice que la pantalla ya no está autorizada (AC-005-04), avisa para volver a pedir código.
 */
export function useScreenSocket(token: string, onUnauthorized: () => void): TvState {
  const [state, dispatch] = useReducer(tvReducer, initialTvState);

  useEffect(() => {
    const socket = io(`${API_URL}${LIVE_NAMESPACE}`, {
      auth: { screenToken: token },
      transports: ['websocket'],
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    });
    socket.on(LiveEvents.screenState, (payload: ScreenState) =>
      dispatch({ type: 'state', state: payload }),
    );
    socket.on(LiveEvents.screenSession, (payload: ScreenSession) =>
      dispatch({ type: 'session', session: payload }),
    );
    socket.on('disconnect', (reason) => {
      dispatch({ type: 'connection', connection: 'reconnecting' });
      // Si es el servidor quien cierra (por ejemplo, al revocarla), se comprueba si sigue autorizada.
      if (reason === 'io server disconnect') socket.connect();
    });
    socket.on('connect_error', (error) => {
      if (/no autorizada/i.test(error.message)) {
        dispatch({ type: 'connection', connection: 'unauthorized' });
        socket.disconnect();
        onUnauthorized();
      } else {
        dispatch({ type: 'connection', connection: 'reconnecting' });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [token, onUnauthorized]);

  return state;
}
