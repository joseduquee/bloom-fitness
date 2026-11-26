import { zodResolver } from '@hookform/resolvers/zod';
import {
  muscleGroupLabels,
  muscleGroupSchema,
  saveTemplateRequestSchema,
  TEMPLATE_MAX_ITEMS,
  type SaveTemplateRequest,
  type TemplateExerciseSummary,
} from '@bloom/shared';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Input, Select } from '../../components/ui/input';
import { cn } from '../../lib/cn';
import { ExerciseThumbnail } from '../exercises/exercise-thumbnail';

interface TemplateFormProps {
  defaultValues?: SaveTemplateRequest;
  /** Ejercicios que se pueden añadir: los activos del catálogo. */
  catalog: TemplateExerciseSummary[];
  /** Ejercicios que ya usa la plantilla, aunque estén desactivados. */
  known?: TemplateExerciseSummary[];
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: SaveTemplateRequest) => void;
  onCancel?: () => void;
}

const NEW_ITEM = { sets: 3, reps: '10', targetLoadKg: null, restSeconds: 90, notes: '' };

/** `''` → null y el resto a número; NaN hace que el esquema muestre «Escribe un número». */
const optionalNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value);

/** Editor de plantilla: datos generales y lista ordenada de ejercicios (AC-003-07 a AC-003-09). */
export function TemplateForm({
  defaultValues,
  catalog,
  known = [],
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: TemplateFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SaveTemplateRequest>({
    resolver: zodResolver(saveTemplateRequestSchema),
    defaultValues: defaultValues ?? { name: '', goal: '', items: [] },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: 'items' });
  const exercises = new Map([...known, ...catalog].map((exercise) => [exercise.id, exercise]));
  const full = fields.length >= TEMPLATE_MAX_ITEMS;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.name?.message}>
          <Input placeholder="Por ejemplo, Día A · Pierna" {...register('name')} />
        </Field>
        <Field label="Objetivo" error={errors.goal?.message}>
          <Input placeholder="Opcional" {...register('goal')} />
        </Field>
      </div>

      <section aria-labelledby="template-exercises" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="template-exercises" className="text-base font-semibold text-slate-900">
            Ejercicios
          </h2>
          <span className="text-sm text-slate-500">
            {fields.length} de {TEMPLATE_MAX_ITEMS}
          </span>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Todavía no hay ejercicios. Añade el primero con el selector de abajo.
          </p>
        ) : (
          <ol className="space-y-3">
            {fields.map((field, index) => {
              const exercise = exercises.get(field.exerciseId);
              const name = exercise?.name ?? 'Ejercicio desconocido';
              const rowErrors = errors.items?.[index];
              return (
                <li key={field.id} className="rounded-lg p-3 ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-semibold text-slate-500 tabular-nums">
                      {index + 1}
                    </span>
                    <ExerciseThumbnail
                      url={exercise?.mediaUrl ?? null}
                      name={name}
                      className="size-10"
                    />
                    <span className="flex-1 font-medium text-slate-900">
                      {name}
                      {exercise && !exercise.isActive && (
                        <span className="ml-2">
                          <Badge tone="neutral">Desactivado</Badge>
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Subir ${name}`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Bajar ${name}`}
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar ${name}`}
                      onClick={() => remove(index)}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[5rem_8rem_7rem_7rem_1fr] sm:pl-9">
                    <SmallField label="Series" error={rowErrors?.sets?.message}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={10}
                        {...register(`items.${index}.sets`, { valueAsNumber: true })}
                      />
                    </SmallField>
                    <SmallField label="Repeticiones" error={rowErrors?.reps?.message}>
                      <Input placeholder="8-10" {...register(`items.${index}.reps`)} />
                    </SmallField>
                    <SmallField label="Carga (kg)" error={rowErrors?.targetLoadKg?.message}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step={0.25}
                        min={0}
                        placeholder="—"
                        {...register(`items.${index}.targetLoadKg`, {
                          setValueAs: optionalNumber,
                        })}
                      />
                    </SmallField>
                    <SmallField label="Descanso (s)" error={rowErrors?.restSeconds?.message}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={15}
                        {...register(`items.${index}.restSeconds`, { valueAsNumber: true })}
                      />
                    </SmallField>
                    <SmallField
                      label="Notas"
                      error={rowErrors?.notes?.message}
                      className="col-span-2 sm:col-span-1"
                    >
                      <Input placeholder="Opcional" {...register(`items.${index}.notes`)} />
                    </SmallField>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <ItemsError errors={errors} />

        <Select
          aria-label="Añadir ejercicio"
          value=""
          disabled={full}
          onChange={(event) => {
            if (event.target.value) append({ exerciseId: event.target.value, ...NEW_ITEM });
          }}
        >
          <option value="">
            {full ? 'Has llegado al máximo de ejercicios' : '+ Añadir ejercicio…'}
          </option>
          {muscleGroupSchema.options.map((muscle) => {
            const group = catalog.filter((exercise) => exercise.primaryMuscle === muscle);
            return group.length === 0 ? null : (
              <optgroup key={muscle} label={muscleGroupLabels[muscle]}>
                {group.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </Select>
      </section>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
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

function ItemsError({ errors }: { errors: FieldErrors<SaveTemplateRequest> }) {
  const message = errors.items?.message ?? errors.items?.root?.message;
  return message ? (
    <p role="alert" className="text-sm text-red-600">
      {message}
    </p>
  ) : null;
}

/** Campo compacto para las filas de la plantilla. El error queda fuera de la etiqueta. */
function SmallField({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="block space-y-1">
        <span className="block text-xs font-medium text-slate-600">{label}</span>
        {children}
      </label>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
