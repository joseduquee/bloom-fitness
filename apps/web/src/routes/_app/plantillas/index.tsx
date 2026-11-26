import { Role, type WorkoutTemplateSummary } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { SearchBox } from '../../../components/search-box';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Dialog } from '../../../components/ui/dialog';
import { Spinner } from '../../../components/ui/spinner';
import { Page } from '../../../components/page';
import { requireRole } from '../../../features/auth/require-role';
import { formatDateTime } from '../../../lib/dates';
import {
  templatesListQuery,
  useDeleteTemplate,
  useDuplicateTemplate,
} from '../../../features/templates/api';
import { errorMessage } from '../../../lib/api';

const searchSchema = z.object({ search: z.string().optional().catch(undefined) });

export const Route = createFileRoute('/_app/plantillas/')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: TemplatesPage,
});

/** Plantillas de entrenamiento del centro (spec 003, HU-003-2). */
function TemplatesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data, isPending, isError, error, isFetching } = useQuery(
    templatesListQuery({ search: search.search, pageSize: 200 }),
  );
  const duplicate = useDuplicateTemplate();
  const [deleting, setDeleting] = useState<WorkoutTemplateSummary | null>(null);

  return (
    <Page
      title="Plantillas"
      description="Entrenamientos de un día que se combinan en las rutinas de los clientes."
      actions={
        <Link
          to="/plantillas/nueva"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
        >
          <Plus className="size-4" aria-hidden="true" />
          Nueva plantilla
        </Link>
      }
    >
      <Card>
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <SearchBox
            label="Buscar por nombre"
            value={search.search ?? ''}
            onChange={(value) =>
              void navigate({ search: { search: value || undefined }, replace: true })
            }
          />
          {isFetching && !isPending && <Spinner className="text-slate-400" label="Actualizando" />}
        </div>

        {duplicate.isError && (
          <div className="p-4 pb-0">
            <Alert>{errorMessage(duplicate.error)}</Alert>
          </div>
        )}

        {isPending ? (
          <div className="flex justify-center p-10">
            <Spinner label="Cargando plantillas" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert>{errorMessage(error)}</Alert>
          </div>
        ) : data.items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">
            {search.search ? 'No hay plantillas con ese nombre.' : 'Todavía no hay plantillas.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((template) => (
              <li key={template.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-48 flex-1">
                  <Link
                    to="/plantillas/$templateId"
                    params={{ templateId: template.id }}
                    className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                  >
                    {template.name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {template.exerciseCount}{' '}
                    {template.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                    {template.goal && ` · ${template.goal}`}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  Actualizada {formatDateTime(template.updatedAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Duplicar ${template.name}`}
                  loading={duplicate.isPending && duplicate.variables === template.id}
                  onClick={() =>
                    duplicate.mutate(template.id, {
                      onSuccess: (copy) =>
                        void navigate({
                          to: '/plantillas/$templateId',
                          params: { templateId: copy.id },
                        }),
                    })
                  }
                >
                  <Copy className="size-4" aria-hidden="true" />
                  Duplicar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Eliminar ${template.name}`}
                  onClick={() => setDeleting(template)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {deleting && <DeleteDialog template={deleting} onClose={() => setDeleting(null)} />}
    </Page>
  );
}

function DeleteDialog({
  template,
  onClose,
}: {
  template: WorkoutTemplateSummary;
  onClose: () => void;
}) {
  const remove = useDeleteTemplate();
  return (
    <Dialog open onClose={onClose} title="¿Eliminar la plantilla?">
      <div className="space-y-4 text-sm text-slate-700">
        {remove.isError && <Alert>{errorMessage(remove.error)}</Alert>}
        <p>
          Se eliminará <strong>{template.name}</strong>. Si alguna rutina la usa, no se podrá
          eliminar.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => remove.mutate(template.id, { onSuccess: onClose })}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
