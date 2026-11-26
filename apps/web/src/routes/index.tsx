import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSession } from '../features/auth/session-store';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: useSession.getState().status === 'authenticated' ? '/inicio' : '/login' });
  },
});
