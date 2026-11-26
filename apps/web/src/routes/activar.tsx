import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@bloom/shared';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Field } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { activateAccount } from '../features/auth/api';
import { AuthLayout } from '../features/auth/auth-layout';
import { errorMessage } from '../lib/api';

const searchSchema = z.object({ token: z.string().catch('') });

const formSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Las contraseñas no coinciden.',
  });
type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute('/activar')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ActivatePage,
});

function ActivatePage() {
  const { token } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const submit = async ({ password }: FormValues) => {
    setError(null);
    try {
      await activateAccount({ token, password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="Cuenta activada"
        subtitle="Ya puedes iniciar sesión con tu nueva contraseña."
      >
        <Link
          to="/login"
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand-700 font-medium text-white hover:bg-brand-900"
        >
          Ir a iniciar sesión
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Activa tu cuenta"
      subtitle="Elige la contraseña con la que accederás a Bloom Fitness."
    >
      {!token ? (
        <Alert>El enlace no es válido. Pide uno nuevo al administrador del centro.</Alert>
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <Field
            label="Nueva contraseña"
            error={errors.password?.message}
            hint="Al menos 10 caracteres."
          >
            <Input
              type="password"
              autoComplete="new-password"
              autoFocus
              {...register('password')}
            />
          </Field>
          <Field label="Repite la contraseña" error={errors.confirm?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirm')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
