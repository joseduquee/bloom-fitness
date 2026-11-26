import {
  listUsersQuerySchema,
  Role,
  roleLabels,
  userStatusLabels,
  userStatusSchema,
  roleSchema,
  type CreateUserResponse,
  type User,
} from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Dialog } from '../../../components/ui/dialog';
import { Input, Select } from '../../../components/ui/input';
import { Spinner } from '../../../components/ui/spinner';
import { Page } from '../../../components/page';
import { requireRole } from '../../../features/auth/require-role';
import { useSession } from '../../../features/auth/session-store';
import { ActivationLink } from '../../../features/users/activation-link';
import { useCreateUser, useSetUserActive, usersListQuery } from '../../../features/users/api';
import { UserForm } from '../../../features/users/user-form';
import { UsersTable } from '../../../features/users/users-table';
import { errorMessage } from '../../../lib/api';

const searchSchema = z.object({
  search: z.string().optional().catch(undefined),
  role: roleSchema.optional().catch(undefined),
  status: userStatusSchema.optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/usuarios/')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: UsersPage,
});

const PAGE_SIZE = 20;

function UsersPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const isAdmin = useSession((state) => state.user?.role === Role.ADMIN);
  const currentUserId = useSession((state) => state.user?.id);
  const query = listUsersQuerySchema.parse({ ...search, pageSize: PAGE_SIZE });
  const { data, isPending, isError, error, isFetching } = useQuery(usersListQuery(query));
  const setActive = useSetUserActive();
  const [creating, setCreating] = useState(false);

  const updateSearch = (changes: Partial<z.infer<typeof searchSchema>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }), replace: true });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <Page
      title={isAdmin ? 'Usuarios' : 'Clientes'}
      description={
        isAdmin ? 'Administradores, entrenadores y clientes del centro.' : 'Clientes del centro.'
      }
      actions={
        isAdmin && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo usuario
          </Button>
        )
      }
    >
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <SearchBox
            value={search.search ?? ''}
            onChange={(value) => updateSearch({ search: value || undefined })}
          />
          {isAdmin && (
            <Select
              aria-label="Filtrar por rol"
              className="w-44"
              value={search.role ?? ''}
              onChange={(event) =>
                updateSearch({ role: roleSchema.optional().parse(event.target.value || undefined) })
              }
            >
              <option value="">Todos los roles</option>
              {Object.values(Role).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </Select>
          )}
          <Select
            aria-label="Filtrar por estado"
            className="w-52"
            value={search.status ?? ''}
            onChange={(event) =>
              updateSearch({
                status: userStatusSchema.optional().parse(event.target.value || undefined),
              })
            }
          >
            <option value="">Todos los estados</option>
            {userStatusSchema.options.map((status) => (
              <option key={status} value={status}>
                {userStatusLabels[status]}
              </option>
            ))}
          </Select>
          {isFetching && !isPending && (
            <Spinner className="self-center text-slate-400" label="Actualizando" />
          )}
        </div>

        {setActive.isError && (
          <div className="p-4 pb-0">
            <Alert>{errorMessage(setActive.error)}</Alert>
          </div>
        )}

        {isPending ? (
          <div className="flex justify-center p-10">
            <Spinner label="Cargando usuarios" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert>{errorMessage(error)}</Alert>
          </div>
        ) : (
          <>
            <UsersTable
              users={data.items}
              canManage={isAdmin}
              currentUserId={currentUserId}
              pendingId={setActive.isPending ? setActive.variables.id : undefined}
              onToggleActive={(user: User) =>
                setActive.mutate({ id: user.id, active: user.status === 'INACTIVE' })
              }
            />
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <span>
                {data.total} {data.total === 1 ? 'usuario' : 'usuarios'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Página anterior"
                  disabled={query.page <= 1}
                  onClick={() =>
                    void navigate({ search: (prev) => ({ ...prev, page: query.page - 1 }) })
                  }
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span>
                  Página {query.page} de {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Página siguiente"
                  disabled={query.page >= totalPages}
                  onClick={() =>
                    void navigate({ search: (prev) => ({ ...prev, page: query.page + 1 }) })
                  }
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}

/** Búsqueda con espera de 300 ms para no lanzar una petición por cada tecla. */
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  // El texto se inicializa desde la URL y a partir de ahí lo gobierna el propio campo.
  const [text, setText] = useState(value);
  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="relative min-w-56 flex-1">
      <Search
        className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label="Buscar por nombre o correo"
        placeholder="Buscar por nombre o correo"
        className="pl-9"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </div>
  );
}

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser();
  const [created, setCreated] = useState<CreateUserResponse | null>(null);

  const close = () => {
    setCreated(null);
    createUser.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={created ? 'Usuario creado' : 'Nuevo usuario'}>
      {created ? (
        <div className="space-y-4">
          <Alert tone="success">
            {created.user.firstName} {created.user.lastName} se ha dado de alta.
          </Alert>
          <ActivationLink url={created.activationUrl} />
          <div className="flex justify-end">
            <Button onClick={close}>Hecho</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {createUser.isError && <Alert>{errorMessage(createUser.error)}</Alert>}
          <UserForm
            submitLabel="Dar de alta"
            submitting={createUser.isPending}
            onCancel={close}
            onSubmit={(values) => createUser.mutate(values, { onSuccess: setCreated })}
          />
        </div>
      )}
    </Dialog>
  );
}
