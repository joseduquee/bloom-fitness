import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema, type LoginRequest } from '@bloom/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import { errorMessage } from '../../lib/api';
import { login } from './api';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({ resolver: zodResolver(loginRequestSchema) });

  const submit = async (values: LoginRequest) => {
    setError(null);
    try {
      await login(values);
      onSuccess();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <Field label="Correo electrónico" error={errors.email?.message}>
        <Input type="email" autoComplete="username" autoFocus {...register('email')} />
      </Field>
      <Field label="Contraseña" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register('password')} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Entrar
      </Button>
    </form>
  );
}
