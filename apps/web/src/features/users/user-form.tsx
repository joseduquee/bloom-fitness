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
  /**
   * Proveedor del que se importó el usuario. Si se indica, nombre, apellidos y correo
   * se muestran como de solo lectura (AC-002-07).
   */
  lockedBy?: string;
  onSubmit: (values: CreateUserRequest) => void;
  onCancel?: () => void;
}

/** Formulario de alta y edición. Valida con el mismo esquema que el API. */
export function UserForm({
  defaultValues,
  submitLabel,
  submitting,
  roles = [Role.CLIENT, Role.TRAINER, Role.ADMIN],
  lockedBy,
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

  const locked = lockedBy !== undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {locked && (
        <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
          Usuario importado de <strong>{lockedBy}</strong>. El nombre, los apellidos y el correo se
          cambian allí y se actualizan en la siguiente importación.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.firstName?.message}>
          <Input autoComplete="given-name" readOnly={locked} {...register('firstName')} />
        </Field>
        <Field label="Apellidos" error={errors.lastName?.message}>
          <Input autoComplete="family-name" readOnly={locked} {...register('lastName')} />
        </Field>
      </div>
      <Field label="Correo electrónico" error={errors.email?.message}>
        <Input type="email" autoComplete="email" readOnly={locked} {...register('email')} />
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
