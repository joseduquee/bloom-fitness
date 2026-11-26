import {
  equipmentLabels,
  equipmentSchema,
  muscleGroupLabels,
  muscleGroupSchema,
  Role,
  type Exercise,
} from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { SearchBox } from '../../components/search-box';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { Select } from '../../components/ui/input';
import { Spinner } from '../../components/ui/spinner';
import { Page } from '../../components/page';
import { requireRole } from '../../features/auth/require-role';
import {
  exercisesListQuery,
  useSaveExercise,
  useSetExerciseActive,
} from '../../features/exercises/api';
import { ExerciseForm } from '../../features/exercises/exercise-form';
import { ExercisesTable } from '../../features/exercises/exercises-table';
import { errorMessage } from '../../lib/api';

const searchSchema = z.object({
  search: z.string().optional().catch(undefined),
  muscle: muscleGroupSchema.optional().catch(undefined),
  equipment: equipmentSchema.optional().catch(undefined),
  inactive: z.boolean().optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/ejercicios')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: ExercisesPage,
});

const PAGE_SIZE = 50;

/** Catálogo de ejercicios del centro (spec 003, HU-003-1). */
function ExercisesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const query = {
    search: search.search,
    muscle: search.muscle,
    equipment: search.equipment,
    includeInactive: search.inactive ? ('true' as const) : undefined,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  };
  const { data, isPending, isError, error, isFetching } = useQuery(exercisesListQuery(query));
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);

  const updateSearch = (changes: Partial<z.infer<typeof searchSchema>>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }), replace: true });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <Page
      title="Ejercicios"
      description="Catálogo común del centro. Se usa para montar las plantillas."
      actions={
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo ejercicio
        </Button>
      }
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <SearchBox
            label="Buscar por nombre"
            value={search.search ?? ''}
            onChange={(value) => updateSearch({ search: value || undefined })}
          />
          <Select
            aria-label="Filtrar por músculo"
            className="w-48"
            value={search.muscle ?? ''}
            onChange={(event) =>
              updateSearch({
                muscle: muscleGroupSchema.optional().parse(event.target.value || undefined),
              })
            }
          >
            <option value="">Todos los músculos</option>
            {muscleGroupSchema.options.map((muscle) => (
              <option key={muscle} value={muscle}>
                {muscleGroupLabels[muscle]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar por equipamiento"
            className="w-52"
            value={search.equipment ?? ''}
            onChange={(event) =>
              updateSearch({
                equipment: equipmentSchema.optional().parse(event.target.value || undefined),
              })
            }
          >
            <option value="">Todo el equipamiento</option>
            {equipmentSchema.options.map((equipment) => (
              <option key={equipment} value={equipment}>
                {equipmentLabels[equipment]}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 accent-brand-700"
              checked={search.inactive ?? false}
              onChange={(event) => updateSearch({ inactive: event.target.checked || undefined })}
            />
            Mostrar desactivados
          </label>
          {isFetching && !isPending && <Spinner className="text-slate-400" label="Actualizando" />}
        </div>

        {isPending ? (
          <div className="flex justify-center p-10">
            <Spinner label="Cargando ejercicios" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert>{errorMessage(error)}</Alert>
          </div>
        ) : (
          <>
            <ExercisesTable exercises={data.items} onEdit={setEditing} />
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <span>
                {data.total} {data.total === 1 ? 'ejercicio' : 'ejercicios'}
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

      {editing !== null && (
        <ExerciseDialog
          exercise={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  );
}

function ExerciseDialog({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const save = useSaveExercise();
  const setActive = useSetExerciseActive();

  return (
    <Dialog open onClose={onClose} title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}>
      <div className="space-y-4">
        {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        {setActive.isError && <Alert>{errorMessage(setActive.error)}</Alert>}
        <ExerciseForm
          defaultValues={
            exercise
              ? {
                  name: exercise.name,
                  primaryMuscle: exercise.primaryMuscle,
                  equipment: exercise.equipment,
                  difficulty: exercise.difficulty,
                  instructions: exercise.instructions ?? '',
                }
              : undefined
          }
          currentMediaUrl={exercise?.mediaUrl}
          submitLabel={exercise ? 'Guardar cambios' : 'Crear ejercicio'}
          submitting={save.isPending}
          onCancel={onClose}
          onSubmit={(values, media) =>
            save.mutate({ id: exercise?.id, values, media }, { onSuccess: onClose })
          }
        />
        {exercise && (
          <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4 text-sm">
            <p className="text-slate-600">
              {exercise.isActive
                ? 'Si lo desactivas deja de aparecer en el catálogo. Las plantillas que ya lo usan no cambian.'
                : 'Está desactivado: no aparece en el catálogo.'}
            </p>
            <Button
              variant={exercise.isActive ? 'secondary' : 'primary'}
              size="sm"
              loading={setActive.isPending}
              onClick={() =>
                setActive.mutate(
                  { id: exercise.id, active: !exercise.isActive },
                  { onSuccess: onClose },
                )
              }
            >
              {exercise.isActive ? 'Desactivar' : 'Reactivar'}
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
