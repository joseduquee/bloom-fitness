import { zodResolver } from '@hookform/resolvers/zod';
import {
  SESSION_MAX_MINUTES,
  SESSION_MIN_MINUTES,
  type SaveSessionRequest,
  type SessionPerson,
} from '@bloom/shared';
import { X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { Input, Select, Textarea } from '../../components/ui/input';
import { madridToUtcIso } from '../../lib/dates';
import { fullName } from './people';

const time = z.string().regex(/^\d{2}:\d{2}$/, 'Indica la hora.');

/** Lo que se edita en el formulario: día y horas de Madrid. Se convierte a UTC al enviar. */
function formSchema(maxAttendees: number) {
  return z
    .object({
      day: z.iso.date('Indica la fecha.'),
      start: time,
      end: time,
      trainerId: z.string().optional(),
      clientIds: z
        .array(z.string())
        .min(1, 'Añade al menos un asistente.')
        .max(maxAttendees, `La sesión admite como máximo ${maxAttendees} asistentes.`),
      notes: z.string().max(500, 'Las notas no pueden superar 500 caracteres.'),
    })
    .superRefine((values, ctx) => {
      const minutes =
        (Date.parse(madridToUtcIso(values.day, values.end)) -
          Date.parse(madridToUtcIso(values.day, values.start))) /
        60_000;
      if (minutes <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['end'],
          message: 'La hora de fin debe ser posterior a la de inicio.',
        });
      } else if (minutes < SESSION_MIN_MINUTES || minutes > SESSION_MAX_MINUTES) {
        ctx.addIssue({
          code: 'custom',
          path: ['end'],
          message: `La sesión debe durar entre ${SESSION_MIN_MINUTES} minutos y ${SESSION_MAX_MINUTES / 60} horas.`,
        });
      }
    });
}

export type SessionFormValues = z.infer<ReturnType<typeof formSchema>>;

interface SessionFormProps {
  defaultValues: SessionFormValues;
  clients: SessionPerson[];
  /** Si se indica, se puede elegir el entrenador (solo administradores). */
  trainers?: SessionPerson[];
  maxAttendees: number;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: SaveSessionRequest) => void;
  onCancel?: () => void;
}

/** Alta y edición de una sesión (AC-004-01). */
export function SessionForm({
  defaultValues,
  clients,
  trainers,
  maxAttendees,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(formSchema(maxAttendees)),
    defaultValues,
  });
  const clientIds = useWatch({ control, name: 'clientIds' });
  const byId = new Map(clients.map((client) => [client.id, client]));
  const available = clients.filter((client) => !clientIds.includes(client.id));
  const full = clientIds.length >= maxAttendees;
  const setClients = (ids: string[]) =>
    setValue('clientIds', ids, { shouldValidate: isSubmitted, shouldDirty: true });

  const submit = (values: SessionFormValues) =>
    onSubmit({
      startsAt: madridToUtcIso(values.day, values.start),
      endsAt: madridToUtcIso(values.day, values.end),
      trainerId: values.trainerId || undefined,
      clientIds: values.clientIds,
      notes: values.notes,
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fecha" error={errors.day?.message}>
          <Input type="date" {...register('day')} />
        </Field>
        <Field label="Inicio" error={errors.start?.message}>
          <Input type="time" step={300} {...register('start')} />
        </Field>
        <Field label="Fin" error={errors.end?.message}>
          <Input type="time" step={300} {...register('end')} />
        </Field>
      </div>

      {trainers && (
        <Field label="Entrenador" error={errors.trainerId?.message}>
          <Select {...register('trainerId')}>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {fullName(trainer)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">
          Asistentes ({clientIds.length} de {maxAttendees})
        </legend>
        {clientIds.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {clientIds.map((id) => {
              const client = byId.get(id);
              const name = client ? fullName(client) : 'Cliente no disponible';
              return (
                <li
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1 pl-3 text-sm text-brand-900"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Quitar a ${name}`}
                    className="rounded-full p-1 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-700"
                    onClick={() => setClients(clientIds.filter((clientId) => clientId !== id))}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Select
          aria-label="Añadir asistente"
          value=""
          disabled={full}
          onChange={(event) => {
            if (event.target.value) setClients([...clientIds, event.target.value]);
          }}
        >
          <option value="">{full ? 'La sesión está completa' : '+ Añadir asistente…'}</option>
          {available.map((client) => (
            <option key={client.id} value={client.id}>
              {fullName(client)}
            </option>
          ))}
        </Select>
        {errors.clientIds && (
          <p role="alert" className="text-sm text-red-600">
            {errors.clientIds.message ?? errors.clientIds.root?.message}
          </p>
        )}
      </fieldset>

      <Field label="Notas" error={errors.notes?.message}>
        <Textarea rows={2} placeholder="Opcional" {...register('notes')} />
      </Field>

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
