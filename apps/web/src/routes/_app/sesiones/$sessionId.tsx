import { Role, sessionStatusLabels } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Flag } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Spinner } from '../../../components/ui/spinner';
import { Page } from '../../../components/page';
import { requireRole } from '../../../features/auth/require-role';
import { useSession } from '../../../features/auth/session-store';
import { exercisesListQuery } from '../../../features/exercises/api';
import { liveSessionQuery, startPlanQuery, useLiveAction } from '../../../features/live/api';
import { AttendeeCard } from '../../../features/live/attendee-card';
import { ConnectionBadge } from '../../../features/live/connection-badge';
import { SessionSummary } from '../../../features/live/session-summary';
import { StartPlanner } from '../../../features/live/start-planner';
import { useLiveSocket } from '../../../features/live/use-live-socket';
import { fullName } from '../../../features/sessions/people';
import { templatesListQuery } from '../../../features/templates/api';
import { errorMessage } from '../../../lib/api';
import { formatLongDay, utcToMadrid } from '../../../lib/dates';

export const Route = createFileRoute('/_app/sesiones/$sessionId')({
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: LiveSessionPage,
});

/** Panel del entrenador para dirigir una sesión (spec 004, HU-004-2 a HU-004-4). */
function LiveSessionPage() {
  const { sessionId } = Route.useParams();
  const me = useSession((state) => state.user);
  const { data: session, isPending, isError, error } = useQuery(liveSessionQuery(sessionId));
  const templates = useQuery(templatesListQuery({ pageSize: 200 }));
  const catalog = useQuery(exercisesListQuery({ pageSize: 200 }));
  const canManage = !!session && (me?.role === Role.ADMIN || session.trainer.id === me?.id);
  // El canal en tiempo real solo hace falta mientras la sesión está en curso (AC-004-15).
  const connection = useLiveSocket(sessionId, session?.status === 'IN_PROGRESS');

  const start = session && utcToMadrid(session.startsAt);
  const title = start ? `Sesión de las ${start.time}` : 'Sesión';

  return (
    <Page
      title={title}
      description={
        session && start ? (
          <span className="flex flex-wrap items-center gap-3">
            <Link
              to="/agenda"
              search={{ vista: 'dia', fecha: start.day }}
              className="inline-flex items-center gap-1 text-brand-700 hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Agenda
            </Link>
            <span className="first-letter:uppercase">{formatLongDay(start.day)}</span>
            <span>· {fullName(session.trainer)}</span>
            <Badge tone={session.status === 'IN_PROGRESS' ? 'success' : 'neutral'}>
              {sessionStatusLabels[session.status]}
            </Badge>
            {session.status === 'IN_PROGRESS' && <ConnectionBadge state={connection} />}
          </span>
        ) : undefined
      }
      actions={
        session?.status === 'IN_PROGRESS' && canManage && <FinishButton sessionId={sessionId} />
      }
    >
      {isPending ? (
        <div className="flex justify-center p-10">
          <Spinner label="Cargando la sesión" />
        </div>
      ) : isError ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : session.status === 'SCHEDULED' ? (
        canManage ? (
          <StartSection sessionId={sessionId} templates={templates.data?.items ?? []} />
        ) : (
          <Alert tone="info">
            La sesión todavía no ha empezado. Solo el entrenador asignado o un administrador puede
            iniciarla.
          </Alert>
        )
      ) : session.status === 'CANCELLED' ? (
        <Alert tone="info">Esta sesión se canceló.</Alert>
      ) : session.status === 'FINISHED' ? (
        <SessionSummary session={session} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {!canManage && (
            <div className="lg:col-span-2">
              <Alert tone="info">
                Estás viendo la sesión. Solo el entrenador asignado o un administrador puede
                dirigirla.
              </Alert>
            </div>
          )}
          {session.attendees.map((attendee) => (
            <AttendeeCard
              key={attendee.client.id}
              sessionId={sessionId}
              attendee={attendee}
              templates={templates.data?.items ?? []}
              catalog={catalog.data?.items ?? []}
              readOnly={!canManage}
            />
          ))}
        </div>
      )}
    </Page>
  );
}

function StartSection({
  sessionId,
  templates,
}: {
  sessionId: string;
  templates: { id: string; name: string }[];
}) {
  const plan = useQuery(startPlanQuery(sessionId));
  const start = useLiveAction(sessionId);

  if (plan.isPending) {
    return (
      <div className="flex justify-center p-10">
        <Spinner label="Calculando la plantilla de cada asistente" />
      </div>
    );
  }
  if (plan.isError) return <Alert>{errorMessage(plan.error)}</Alert>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Revisa la plantilla de cada asistente. La propuesta sale de su rutina activa y del día que
        hizo la última vez.
      </p>
      {start.isError && <Alert>{errorMessage(start.error)}</Alert>}
      <StartPlanner
        plan={plan.data}
        templates={templates}
        starting={start.isPending}
        onStart={(body) => start.mutate({ type: 'start', body })}
      />
    </div>
  );
}

function FinishButton({ sessionId }: { sessionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const finish = useLiveAction(sessionId);
  return (
    <>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        <Flag className="size-4" aria-hidden="true" />
        Finalizar sesión
      </Button>
      <Dialog open={confirming} onClose={() => setConfirming(false)} title="¿Finalizar la sesión?">
        <div className="space-y-4 text-sm text-slate-700">
          {finish.isError && <Alert>{errorMessage(finish.error)}</Alert>}
          <p>
            Dejará de mostrarse en las pantallas y las series registradas pasarán al histórico.
            Después no se podrá modificar.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Seguir con la sesión
            </Button>
            <Button
              variant="danger"
              loading={finish.isPending}
              onClick={() =>
                finish.mutate({ type: 'finish' }, { onSuccess: () => setConfirming(false) })
              }
            >
              Finalizar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
