import { routineDayLabel, type Routine } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Alert } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Spinner } from '../../components/ui/spinner';
import { errorMessage } from '../../lib/api';
import { formatDay } from '../../lib/dates';
import { clientRoutinesQuery, useSetRoutineActive } from './api';

/** Rutinas de un cliente en su ficha (spec 003, HU-003-3). */
export function RoutinesSection({ clientId }: { clientId: string }) {
  const { data, isPending, isError, error } = useQuery(clientRoutinesQuery(clientId));
  const setActive = useSetRoutineActive();

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">Rutinas</h2>
        <Link
          to="/rutinas/nueva"
          search={{ cliente: clientId }}
          className="inline-flex h-8 items-center gap-2 rounded-lg bg-brand-700 px-3 text-sm font-medium text-white hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nueva rutina
        </Link>
      </div>

      {setActive.isError && (
        <div className="px-6 pt-4">
          <Alert>{errorMessage(setActive.error)}</Alert>
        </div>
      )}

      {isPending ? (
        <div className="flex justify-center p-8">
          <Spinner label="Cargando rutinas" />
        </div>
      ) : isError ? (
        <div className="p-6">
          <Alert>{errorMessage(error)}</Alert>
        </div>
      ) : data.items.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">
          Este cliente todavía no tiene ninguna rutina.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.items.map((routine) => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              pending={setActive.isPending && setActive.variables.id === routine.id}
              onToggle={() => setActive.mutate({ id: routine.id, active: !routine.isActive })}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function RoutineRow({
  routine,
  pending,
  onToggle,
}: {
  routine: Routine;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="space-y-2 px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/rutinas/$routineId"
          params={{ routineId: routine.id }}
          className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
        >
          {routine.name}
        </Link>
        {routine.isActive ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}
        <span className="flex-1 text-sm text-slate-500">
          Desde el {formatDay(routine.startsOn)}
          {routine.endsOn && ` hasta el ${formatDay(routine.endsOn)}`}
        </span>
        <Button
          variant={routine.isActive ? 'secondary' : 'primary'}
          size="sm"
          loading={pending}
          onClick={onToggle}
        >
          {routine.isActive ? 'Desactivar' : 'Activar'}
        </Button>
      </div>
      {routine.goal && <p className="text-sm text-slate-600">{routine.goal}</p>}
      <ol className="flex flex-wrap gap-2" aria-label={`Plantillas de ${routine.name}`}>
        {routine.templates.map((template) => (
          <li
            key={template.position}
            className="inline-flex items-center gap-2 rounded-md bg-slate-100 py-1 pr-2 pl-1 text-sm text-slate-700"
          >
            <span className="rounded bg-white px-1.5 font-semibold text-slate-900">
              {routineDayLabel(template.position)}
            </span>
            {template.name}
          </li>
        ))}
      </ol>
    </li>
  );
}
