import { Role, type User } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Link2 } from 'lucide-react';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Spinner } from '../../../components/ui/spinner';
import { Page } from '../../../components/page';
import { useSession } from '../../../features/auth/session-store';
import { ActivationLink } from '../../../features/users/activation-link';
import {
  useActivationLink,
  useSetUserActive,
  userQuery,
  useUpdateUser,
} from '../../../features/users/api';
import { RoleBadge, StatusBadge } from '../../../features/users/user-badges';
import { UserForm } from '../../../features/users/user-form';
import { errorMessage } from '../../../lib/api';

export const Route = createFileRoute('/_app/usuarios/$userId')({
  component: UserDetailPage,
});

const dateFormat = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Madrid',
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const { data: user, isPending, isError, error } = useQuery(userQuery(userId));

  return (
    <Page
      title={user ? `${user.firstName} ${user.lastName}` : 'Usuario'}
      description={
        <Link
          to="/usuarios"
          className="inline-flex items-center gap-1 text-brand-700 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al listado
        </Link>
      }
    >
      {isPending ? (
        <div className="flex justify-center p-10">
          <Spinner label="Cargando usuario" />
        </div>
      ) : isError ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : (
        <UserDetail user={user} />
      )}
    </Page>
  );
}

function UserDetail({ user }: { user: User }) {
  const currentUser = useSession((state) => state.user);
  const isAdmin = currentUser?.role === Role.ADMIN;
  const isSelf = currentUser?.id === user.id;
  const update = useUpdateUser(user.id);
  const setActive = useSetUserActive();
  const activationLink = useActivationLink();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Datos</h2>
        {isAdmin ? (
          <div className="space-y-4">
            {update.isError && <Alert>{errorMessage(update.error)}</Alert>}
            {update.isSuccess && <Alert tone="success">Cambios guardados.</Alert>}
            <UserForm
              key={user.id}
              submitLabel="Guardar cambios"
              submitting={update.isPending}
              roles={isSelf ? [Role.ADMIN] : undefined}
              defaultValues={{
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                alias: user.alias ?? '',
                role: user.role,
              }}
              onSubmit={(values) => update.mutate(values)}
            />
          </div>
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Correo" value={user.email} />
            <Detail label="Alias" value={user.alias ?? '—'} />
          </dl>
        )}
      </Card>

      <div className="space-y-6">
        <Card className="space-y-3 p-6 text-sm">
          <h2 className="text-base font-semibold text-slate-900">Cuenta</h2>
          <div className="flex flex-wrap gap-2">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
          <Detail label="Alta" value={dateFormat.format(new Date(user.createdAt))} />
          <Detail
            label="Último acceso"
            value={user.lastLoginAt ? dateFormat.format(new Date(user.lastLoginAt)) : 'Nunca'}
          />
        </Card>

        {isAdmin && !isSelf && (
          <Card className="space-y-4 p-6">
            <h2 className="text-base font-semibold text-slate-900">Acciones</h2>
            {(setActive.isError || activationLink.isError) && (
              <Alert>{errorMessage(setActive.error ?? activationLink.error)}</Alert>
            )}
            {user.status !== 'INACTIVE' && (
              <Button
                variant="secondary"
                className="w-full"
                loading={activationLink.isPending}
                onClick={() => activationLink.mutate(user.id)}
              >
                <Link2 className="size-4" aria-hidden="true" />
                {user.status === 'PENDING'
                  ? 'Generar enlace de activación'
                  : 'Generar enlace para cambiar contraseña'}
              </Button>
            )}
            {activationLink.data && <ActivationLink url={activationLink.data.activationUrl} />}
            <Button
              variant={user.status === 'INACTIVE' ? 'secondary' : 'danger'}
              className="w-full"
              loading={setActive.isPending}
              onClick={() => setActive.mutate({ id: user.id, active: user.status === 'INACTIVE' })}
            >
              {user.status === 'INACTIVE' ? 'Reactivar usuario' : 'Desactivar usuario'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
