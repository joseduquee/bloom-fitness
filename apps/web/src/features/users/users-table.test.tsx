import type { User } from '@bloom/shared';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UsersTable } from './users-table';

const users: User[] = [
  {
    id: '1b0b3c84-6c0e-4c1a-9a65-1f9f6c2e2a01',
    email: 'sergio@bloom.test',
    firstName: 'Sergio',
    lastName: 'Uno',
    alias: 'Sergio',
    role: 'CLIENT',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-11-26T10:00:00.000Z',
  },
  {
    id: '2b0b3c84-6c0e-4c1a-9a65-1f9f6c2e2a02',
    email: 'pablo@bloom.test',
    firstName: 'Pablo',
    lastName: 'Cinco',
    alias: null,
    role: 'CLIENT',
    status: 'INACTIVE',
    lastLoginAt: null,
    createdAt: '2026-11-26T10:00:00.000Z',
  },
];

/** La tabla usa <Link>, así que se monta dentro de un router de memoria. */
function renderTable(props: Parameters<typeof UsersTable>[0]) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <UsersTable {...props} />,
  });
  const detailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/usuarios/$userId' });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('UsersTable', () => {
  it('muestra el estado de cada usuario y la acción adecuada', async () => {
    renderTable({ users, canManage: true, onToggleActive: vi.fn() });
    expect(await screen.findByText('Sergio Uno')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Desactivado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
  });

  it('marca como ocupada solo la fila del usuario en curso (estado de carga por entidad)', async () => {
    const onToggleActive = vi.fn();
    renderTable({ users, canManage: true, pendingId: users[0]?.id, onToggleActive });
    const [busy, idle] = await screen.findAllByRole('button');
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(idle).not.toHaveAttribute('aria-busy');
    await userEvent.click(idle!);
    expect(onToggleActive).toHaveBeenCalledWith(users[1]);
  });

  it('un entrenador no ve las acciones de gestión', async () => {
    renderTable({ users, canManage: false, onToggleActive: vi.fn() });
    expect(await screen.findByText('Sergio Uno')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('el administrador no ve la opción de desactivarse a sí mismo', async () => {
    renderTable({ users, canManage: true, currentUserId: users[0]?.id, onToggleActive: vi.fn() });
    expect(await screen.findByText('Sergio Uno')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
  });
});
