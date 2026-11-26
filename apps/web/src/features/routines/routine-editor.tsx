import type { CreateRoutineRequest, Routine } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert } from '../../components/ui/alert';
import { Card } from '../../components/ui/card';
import { Spinner } from '../../components/ui/spinner';
import { errorMessage } from '../../lib/api';
import { today } from '../../lib/dates';
import { templatesListQuery } from '../templates/api';
import { useCreateRoutine, useUpdateRoutine } from './api';
import { RoutineForm } from './routine-form';

/** Crea una rutina para el cliente o edita una existente. */
export function RoutineEditor({ clientId, routine }: { clientId: string; routine?: Routine }) {
  const navigate = useNavigate();
  const templates = useQuery(templatesListQuery({ pageSize: 200 }));
  const create = useCreateRoutine(clientId);
  const update = useUpdateRoutine(routine?.id ?? '');
  const save = routine ? update : create;
  const backToClient = () =>
    void navigate({ to: '/usuarios/$userId', params: { userId: clientId } });

  const defaultValues: CreateRoutineRequest = routine
    ? {
        name: routine.name,
        goal: routine.goal ?? '',
        startsOn: routine.startsOn,
        endsOn: routine.endsOn ?? '',
        templateIds: routine.templates.map((template) => template.id),
        activate: routine.isActive,
      }
    : { name: '', goal: '', startsOn: today(), endsOn: '', templateIds: [], activate: true };

  // Las plantillas de la rutina siempre se pueden mostrar, aunque no salgan en la búsqueda.
  const options = [
    ...(templates.data?.items ?? []),
    ...(routine?.templates ?? []).filter(
      (template) => !templates.data?.items.some((item) => item.id === template.id),
    ),
  ];

  return (
    <Card className="p-6">
      {templates.isPending ? (
        <div className="flex justify-center p-6">
          <Spinner label="Cargando plantillas" />
        </div>
      ) : templates.isError ? (
        <Alert>{errorMessage(templates.error)}</Alert>
      ) : (
        <div className="space-y-4">
          {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
          <RoutineForm
            defaultValues={defaultValues}
            templates={options}
            showActivate={!routine}
            submitLabel={routine ? 'Guardar cambios' : 'Crear rutina'}
            submitting={save.isPending}
            onCancel={backToClient}
            onSubmit={({ activate, ...values }) => {
              if (routine) update.mutate(values, { onSuccess: backToClient });
              else create.mutate({ ...values, activate }, { onSuccess: backToClient });
            }}
          />
        </div>
      )}
    </Card>
  );
}
