import type { SessionResponse, SessionUser } from '@bloom/shared';
import { create } from 'zustand';

type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

interface SessionState {
  status: SessionStatus;
  /** El token de acceso solo vive en memoria; nunca en localStorage. */
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (session: SessionResponse) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ status: 'authenticated', accessToken, user }),
  clear: () => set({ status: 'anonymous', accessToken: null, user: null }),
}));
