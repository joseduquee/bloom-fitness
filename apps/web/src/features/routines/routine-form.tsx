import { zodResolver } from '@hookform/resolvers/zod';
import {
  createRoutineRequestSchema,
  ROUTINE_MAX_TEMPLATES,
  routineDayLabel,
  type CreateRoutineRequest,
  type WorkoutTemplateSummary,
} from '@bloom/shared';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Input, Select } from '../../components/ui/input';

interface RoutineFormProps {
  defaultValues: CreateRoutineRequest;
  templates: Pick<WorkoutTemplateSummary, 'id' | 'name' | 'exerciseCount'>[];
  /** Al editar no se muestra la casilla de activar: se activa desde la ficha del cliente. */
  showActivate: boolean;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: CreateRoutineRequest) => void;
  onCancel?: () => void;
}

/** Rutina de un cliente: datos, fechas y secuencia de plantillas (AC-003-12). */
export function RoutineForm({
  defaultValues,
  templates,
  showActivate,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: RoutineFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<CreateRoutineRequest>({
    resolver: zodResolver(createRoutineRequestSchema),
    defaultValues,
  });
  const templateIds = useWatch({ control, name: 'templateIds' });
  const byId = new Map(templates.map((template) => [template.id, template]));
  const full = templateIds.length >= ROUTINE_MAX_TEMPLATES;

  const setTemplateIds = (ids: string[]) =>
    setValue('templateIds', ids, { shouldValidate: isSubmitted, shouldDirty: true });
  const moveTo = (from: number, to: number) => {
    const ids = [...templateIds];
    const [moved] = ids.splice(from, 1);
    if (moved) ids.splice(to, 0, moved);
    setTemplateIds(ids);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.name?.message}>
          <Input placeholder="Por ejemplo, Fuerza · bloque 1" {...register('name')} />
        </Field>
        <Field label="Objetivo" error={errors.goal?.message}>
          <Input placeholder="Opcional" {...register('goal')} />
        </Field>
        <Field label="Fecha de inicio" error={errors.startsOn?.message}>
          <Input type="date" {...register('startsOn')} />
        </Field>
        <Field label="Fecha de fin" error={errors.endsOn?.message} hint="Opcional">
          <Input type="date" {...register('endsOn')} />
        </Field>
      </div>

      <section aria-labelledby="routine-templates" className="space-y-3">
        <div>
          <h2 id="routine-templates" className="text-base font-semibold text-slate-900">
            Plantillas
          </h2>
          <p className="text-sm text-slate-500">
            Se proponen en este orden y vuelven a empezar al llegar al final. Una plantilla puede
            repetirse.
          </p>
        </div>

        {templateIds.length > 0 && (
          <ol className="space-y-2">
            {templateIds.map((id, index) => {
              const template = byId.get(id);
              const name = template?.name ?? 'Plantilla eliminada';
              return (
                <li
                  key={`${id}-${index}`}
                  className="flex items-center gap-3 rounded-lg p-2 ring-1 ring-slate-200"
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-brand-50 font-semibold text-brand-900">
                    {routineDayLabel(index)}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium text-slate-900">{name}</span>
                    {template && (
                      <span className="ml-2 text-sm text-slate-500">
                        {template.exerciseCount}{' '}
                        {template.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                      </span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Subir el día ${routineDayLabel(index)}`}
                    disabled={index === 0}
                    onClick={() => moveTo(index, index - 1)}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Bajar el día ${routineDayLabel(index)}`}
                    disabled={index === templateIds.length - 1}
                    onClick={() => moveTo(index, index + 1)}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Quitar el día ${routineDayLabel(index)}`}
                    onClick={() => setTemplateIds(templateIds.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ol>
        )}

        {errors.templateIds && (
          <p role="alert" className="text-sm text-red-600">
            {errors.templateIds.message ?? errors.templateIds.root?.message}
          </p>
        )}

        <Select
          aria-label="Añadir plantilla"
          value=""
          disabled={full || templates.length === 0}
          onChange={(event) => {
            if (event.target.value) setTemplateIds([...templateIds, event.target.value]);
          }}
        >
          <option value="">
            {templates.length === 0
              ? 'No hay plantillas: créalas antes en «Plantillas»'
              : full
                ? 'Has llegado al máximo de plantillas'
                : '+ Añadir plantilla…'}
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
      </section>

      {showActivate && (
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-slate-300 accent-brand-700"
            {...register('activate')}
          />
          <span>
            Activar al guardar. Si el cliente tiene otra rutina activa, pasará a inactiva.
          </span>
        </label>
      )}

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
