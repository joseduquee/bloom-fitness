import type { User } from '@bloom/shared';
import { Link } from '@tanstack/react-router';
import { Button } from '../../components/ui/button';
import { RoleBadge, StatusBadge } from './user-badges';

interface UsersTableProps {
  users: User[];
  canManage: boolean;
  /** El usuario de la sesión no puede desactivarse a sí mismo. */
  currentUserId?: string;
  /** Id del usuario cuya activación o desactivación está en curso. */
  pendingId?: string;
  onToggleActive: (user: User) => void;
}

export function UsersTable({
  users,
  canManage,
  currentUserId,
  pendingId,
  onToggleActive,
}: UsersTableProps) {
  if (users.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">
        No hay usuarios que coincidan con la búsqueda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              Nombre
            </th>
            <th scope="col" className="px-4 py-3">
              Correo
            </th>
            <th scope="col" className="px-4 py-3">
              Rol
            </th>
            <th scope="col" className="px-4 py-3">
              Estado
            </th>
            {canManage && (
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Acciones</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  to="/usuarios/$userId"
                  params={{ userId: user.id }}
                  className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                >
                  {user.firstName} {user.lastName}
                </Link>
                {user.alias && <span className="ml-2 text-slate-500">({user.alias})</span>}
              </td>
              <td className="px-4 py-3 text-slate-600">{user.email}</td>
              <td className="px-4 py-3">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={user.status} />
              </td>
              {canManage && (
                <td className="px-4 py-3 text-right">
                  {user.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={pendingId === user.id}
                      onClick={() => onToggleActive(user)}
                    >
                      {user.status === 'INACTIVE' ? 'Reactivar' : 'Desactivar'}
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
