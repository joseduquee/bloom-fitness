import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthLayout } from '../features/auth/auth-layout';
import { LoginForm } from '../features/auth/login-form';
import { useSession } from '../features/auth/session-store';

const searchSchema = z.object({ redirect: z.string().startsWith('/').optional().catch(undefined) });

export const Route = createFileRoute('/login')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: ({ search }) => {
    if (useSession.getState().status === 'authenticated') {
      throw redirect({ to: search.redirect ?? '/inicio' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: target } = Route.useSearch();

  return (
    <AuthLayout title="Inicia sesión" subtitle="Accede con tu correo y tu contraseña.">
      <LoginForm onSuccess={() => void navigate({ to: target ?? '/inicio' })} />
    </AuthLayout>
  );
}
