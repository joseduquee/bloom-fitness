import { LiveEvents, type LiveSession, type SubscribeAck } from '@bloom/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { liveSocket } from '../../lib/socket';
import { liveKeys } from './api';

export type LiveConnection = 'connecting' | 'live' | 'reconnecting' | 'offline';

/**
 * Mantiene la instantánea del panel al día con el canal en tiempo real (AC-004-15).
 * Solo se acepta una instantánea si su revisión no es anterior a la que ya hay: así un evento
 * atrasado nunca deshace un cambio más reciente.
 */
export function useLiveSocket(sessionId: string, enabled: boolean): LiveConnection {
  const queryClient = useQueryClient();
  const [state, setState] = useState<LiveConnection>('connecting');

  useEffect(() => {
    if (!enabled) return;
    const socket = liveSocket();

    const accept = (snapshot: LiveSession) => {
      if (snapshot.id !== sessionId) return;
      const current = queryClient.getQueryData<LiveSession>(liveKeys.session(sessionId));
      if (!current || snapshot.revision >= current.revision) {
        queryClient.setQueryData(liveKeys.session(sessionId), snapshot);
      }
    };
    const subscribe = () => {
      void (
        socket.emitWithAck(LiveEvents.sessionSubscribe, { sessionId }) as Promise<SubscribeAck>
      ).then((ack) => setState(ack.ok ? 'live' : 'offline'));
    };
    const onDisconnect = () => setState('reconnecting');
    const onError = () => setState(socket.active ? 'reconnecting' : 'offline');

    socket.on('connect', subscribe);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    socket.on(LiveEvents.sessionSnapshot, accept);
    socket.on(LiveEvents.sessionUpdated, accept);
    if (socket.connected) subscribe();
    else socket.connect();

    return () => {
      socket.off('connect', subscribe);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.off(LiveEvents.sessionSnapshot, accept);
      socket.off(LiveEvents.sessionUpdated, accept);
      if (socket.connected) socket.emit(LiveEvents.sessionUnsubscribe, { sessionId });
    };
  }, [enabled, queryClient, sessionId]);

  return enabled ? state : 'offline';
}
