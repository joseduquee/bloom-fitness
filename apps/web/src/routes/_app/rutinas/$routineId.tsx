import { Role } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import { Spinner } from '../../../components/ui/spinner';
import { Page } from '../../../components/page';
import { requireRole } from '../../../features/auth/require-role';
import { routineQuery } from '../../../features/routines/api';
import { RoutineEditor } from '../../../features/routines/routine-editor';
import { errorMessage } from '../../../lib/api';

export const Route = createFileRoute('/_app/rutinas/$routineId')({
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: RoutinePage,
});

function RoutinePage() {
  const { routineId } = Route.useParams();
  const { data, isPending, isError, error } = useQuery(routineQuery(routineId));

  return (
    <Page
      title={data?.name ?? 'Rutina'}
      description={
        data && (
          <span className="flex flex-wrap items-center gap-3">
            <Link
              to="/usuarios/$userId"
              params={{ userId: data.clientId }}
              className="inline-flex items-center gap-1 text-brand-700 hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a la ficha del cliente
            </Link>
            {data.isActive ? <Badge tone="success">Activa</Badge> : <Badge>Inactiva</Badge>}
          </span>
        )
      }
    >
      {isPending ? (
        <div className="flex justify-center p-10">
          <Spinner label="Cargando la rutina" />
        </div>
      ) : isError ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : (
        <RoutineEditor key={data.updatedAt} clientId={data.clientId} routine={data} />
      )}
    </Page>
  );
}
