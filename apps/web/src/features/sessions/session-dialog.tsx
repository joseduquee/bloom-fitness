import { Role, sessionStatusLabels, type SessionPerson, type TrainingSession } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Spinner } from '../../components/ui/spinner';
import { errorMessage } from '../../lib/api';
import { formatLongDay, utcToMadrid } from '../../lib/dates';
import { useSession } from '../auth/session-store';
import { usersListQuery } from '../users/api';
import { useCancelSession, useSaveSession } from './api';
import { fullName } from './people';
import { SessionForm, type SessionFormValues } from './session-form';

const toPerson = ({ id, firstName, lastName, alias }: SessionPerson): SessionPerson => ({
  id,
  firstName,
  lastName,
  alias,
});

interface SessionDialogProps {
  /** Sesión que se edita o null para crear una nueva. */
  session: TrainingSession | null;
  defaultDay: string;
  maxAttendees: number;
  onClose: () => void;
}

/** Crea, edita, cancela o muestra una sesión según el estado y los permisos (AC-004-01, AC-004-09). */
export function SessionDialog({ session, defaultDay, maxAttendees, onClose }: SessionDialogProps) {
  const me = useSession((state) => state.user);
  const isAdmin = me?.role === Role.ADMIN;
  const canManage = !session || isAdmin || session.trainer.id === me?.id;
  const editable = canManage && (!session || session.status === 'SCHEDULED');

  const clients = useQuery({
    ...usersListQuery({ role: 'CLIENT', status: 'ACTIVE', pageSize: 100 }),
    enabled: editable,
  });
  const trainers = useQuery({
    ...usersListQuery({ role: 'TRAINER', status: 'ACTIVE', pageSize: 100 }),
    enabled: editable && isAdmin,
  });
  const save = useSaveSession();
  const cancel = useCancelSession();

  const title = !session ? 'Nueva sesión' : editable ? 'Editar sesión' : 'Sesión';

  if (!editable && session) {
    const start = utcToMadrid(session.startsAt);
    return (
      <Dialog open onClose={onClose} title={title}>
        <dl className="space-y-3 text-sm">
          <Detail label="Fecha" value={formatLongDay(start.day)} />
          <Detail label="Horario" value={`${start.time}–${utcToMadrid(session.endsAt).time}`} />
          <Detail label="Estado" value={sessionStatusLabels[session.status]} />
          <Detail label="Entrenador" value={fullName(session.trainer)} />
          <Detail label="Asistentes" value={session.attendees.map(fullName).join(', ')} />
          {session.notes && <Detail label="Notas" value={session.notes} />}
        </dl>
        {!canManage && (
          <p className="mt-4 text-sm text-slate-500">
            Solo el entrenador asignado o un administrador puede modificarla.
          </p>
        )}
      </Dialog>
    );
  }

  const loading = clients.isPending || (isAdmin && trainers.isPending);
  const loadError = clients.error ?? trainers.error;
  const clientOptions = [
    ...(clients.data?.items.map(toPerson) ?? []),
    // Los asistentes actuales se muestran aunque ya no estén activos.
    ...(session?.attendees ?? []).filter(
      (attendee) => !clients.data?.items.some((client) => client.id === attendee.id),
    ),
  ];
  const trainerOptions = isAdmin
    ? uniqueById([
        ...(me ? [toPerson({ ...me, alias: me.alias ?? null })] : []),
        ...(session ? [session.trainer] : []),
        ...(trainers.data?.items.map(toPerson) ?? []),
      ])
    : undefined;

  const defaultValues: SessionFormValues = session
    ? {
        day: utcToMadrid(session.startsAt).day,
        start: utcToMadrid(session.startsAt).time,
        end: utcToMadrid(session.endsAt).time,
        trainerId: session.trainer.id,
        clientIds: session.attendees.map((attendee) => attendee.id),
        notes: session.notes ?? '',
      }
    : {
        day: defaultDay,
        start: '09:00',
        end: '10:00',
        trainerId: me?.id,
        clientIds: [],
        notes: '',
      };

  return (
    <Dialog open onClose={onClose} title={title}>
      {loading ? (
        <div className="flex justify-center p-6">
          <Spinner label="Cargando clientes" />
        </div>
      ) : loadError ? (
        <Alert>{errorMessage(loadError)}</Alert>
      ) : (
        <div className="space-y-4">
          {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
          {cancel.isError && <Alert>{errorMessage(cancel.error)}</Alert>}
          <SessionForm
            defaultValues={defaultValues}
            clients={clientOptions}
            trainers={trainerOptions}
            maxAttendees={maxAttendees}
            submitLabel={session ? 'Guardar cambios' : 'Programar sesión'}
            submitting={save.isPending}
            onCancel={onClose}
            onSubmit={(values) => save.mutate({ id: session?.id, values }, { onSuccess: onClose })}
          />
          {session && (
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4 text-sm">
              <p className="text-slate-600">La sesión cancelada sigue en la agenda, tachada.</p>
              <Button
                variant="danger"
                size="sm"
                loading={cancel.isPending}
                onClick={() => cancel.mutate(session.id, { onSuccess: onClose })}
              >
                Cancelar sesión
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function uniqueById(people: SessionPerson[]): SessionPerson[] {
  return [...new Map(people.map((person) => [person.id, person])).values()];
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
