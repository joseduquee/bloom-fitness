import { Role } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { Alert } from '../../../components/ui/alert';
import { Spinner } from '../../../components/ui/spinner';
import { Page } from '../../../components/page';
import { requireRole } from '../../../features/auth/require-role';
import { RoutineEditor } from '../../../features/routines/routine-editor';
import { userQuery } from '../../../features/users/api';
import { errorMessage } from '../../../lib/api';

const searchSchema = z.object({ cliente: z.uuid() });

export const Route = createFileRoute('/_app/rutinas/nueva')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: NewRoutinePage,
});

/** Nueva rutina para un cliente (AC-003-12). */
function NewRoutinePage() {
  const { cliente } = Route.useSearch();
  const client = useQuery(userQuery(cliente));
  const clientName = client.data ? `${client.data.firstName} ${client.data.lastName}` : '';

  return (
    <Page
      title={clientName ? `Nueva rutina para ${clientName}` : 'Nueva rutina'}
      description={
        <Link
          to="/usuarios/$userId"
          params={{ userId: cliente }}
          className="inline-flex items-center gap-1 text-brand-700 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a la ficha del cliente
        </Link>
      }
    >
      {client.isPending ? (
        <div className="flex justify-center p-10">
          <Spinner label="Cargando el cliente" />
        </div>
      ) : client.isError ? (
        <Alert>{errorMessage(client.error)}</Alert>
      ) : (
        <RoutineEditor clientId={cliente} />
      )}
    </Page>
  );
}
