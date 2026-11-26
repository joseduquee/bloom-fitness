import { roleLabels, type Role } from '@bloom/shared';
import { createFileRoute, Link, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { Download, House, LogOut, Users, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button';
import { logout } from '../features/auth/api';
import { useSession } from '../features/auth/session-store';

interface NavItem {
  to: '/inicio' | '/usuarios' | '/importacion';
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

/** Navegación según el rol (spec 001). Las iteraciones siguientes añaden entradas. */
const navItems: NavItem[] = [
  { to: '/inicio', label: 'Inicio', icon: House, roles: ['ADMIN', 'TRAINER', 'CLIENT'] },
  { to: '/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
  { to: '/usuarios', label: 'Clientes', icon: Users, roles: ['TRAINER'] },
  { to: '/importacion', label: 'Importación', icon: Download, roles: ['ADMIN'] },
];

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (useSession.getState().status !== 'authenticated') {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const user = useSession((state) => state.user);
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  if (!user) return null;

  const items = navItems.filter((item) => item.roles.includes(user.role));

  const signOut = async () => {
    setLeaving(true);
    await logout();
    await navigate({ to: '/login' });
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-slate-200 bg-white lg:flex lg:min-h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2 px-6 py-4 text-lg font-semibold text-brand-900">
          <img src="/favicon.svg" alt="" className="size-7" />
          Bloom Fitness
        </div>
        <nav
          aria-label="Principal"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col"
        >
          {items.map((item) => (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-slate-100"
              activeProps={{ className: 'bg-brand-50 text-brand-900 hover:bg-brand-50' }}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-slate-200 p-4 lg:block">
          <p className="truncate text-sm font-medium text-slate-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-slate-500">{roleLabels[user.role]}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 -ml-2"
            loading={leaving}
            onClick={() => void signOut()}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex justify-end border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <Button variant="ghost" size="sm" loading={leaving} onClick={() => void signOut()}>
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
