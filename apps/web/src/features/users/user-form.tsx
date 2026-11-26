import { zodResolver } from '@hookform/resolvers/zod';
import { createUserRequestSchema, Role, roleLabels, type CreateUserRequest } from '@bloom/shared';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Input, Select } from '../../components/ui/input';

interface UserFormProps {
  defaultValues?: Partial<CreateUserRequest>;
  submitLabel: string;
  submitting: boolean;
  /** Roles que se pueden asignar desde este formulario. */
  roles?: Role[];
  onSubmit: (values: CreateUserRequest) => void;
  onCancel?: () => void;
}

/** Formulario de alta y edición. Valida con el mismo esquema que el API. */
export function UserForm({
  defaultValues,
  submitLabel,
  submitting,
  roles = [Role.CLIENT, Role.TRAINER, Role.ADMIN],
  onSubmit,
  onCancel,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserRequest>({
    resolver: zodResolver(createUserRequestSchema),
    defaultValues: { role: Role.CLIENT, alias: '', ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.firstName?.message}>
          <Input autoComplete="given-name" {...register('firstName')} />
        </Field>
        <Field label="Apellidos" error={errors.lastName?.message}>
          <Input autoComplete="family-name" {...register('lastName')} />
        </Field>
      </div>
      <Field label="Correo electrónico" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register('email')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Alias"
          error={errors.alias?.message}
          hint="Nombre corto que verá en la pantalla de sala."
        >
          <Input {...register('alias')} />
        </Field>
        <Field label="Rol" error={errors.role?.message}>
          <Select {...register('role')}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
