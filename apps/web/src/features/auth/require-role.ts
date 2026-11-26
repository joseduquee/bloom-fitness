import type { Role } from '@bloom/shared';
import { redirect } from '@tanstack/react-router';
import { useSession } from './session-store';

/** Para `beforeLoad`: si el rol no está permitido, vuelve al inicio. La seguridad real está en el API. */
export function requireRole(...roles: Role[]): void {
  const role = useSession.getState().user?.role;
  if (!role || !roles.includes(role)) {
    throw redirect({ to: '/inicio' });
  }
}
