import type { SaveTemplateRequest, WorkoutTemplate } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Alert } from '../../components/ui/alert';
import { Card } from '../../components/ui/card';
import { Spinner } from '../../components/ui/spinner';
import { errorMessage } from '../../lib/api';
import { exercisesListQuery } from '../exercises/api';
import { useSaveTemplate } from './api';
import { TemplateForm } from './template-form';

/** Carga el catálogo y guarda la plantilla. Se usa para crear y para editar. */
export function TemplateEditor({ template }: { template?: WorkoutTemplate }) {
  const navigate = useNavigate();
  const catalog = useQuery(exercisesListQuery({ pageSize: 200 }));
  const save = useSaveTemplate();

  const defaultValues: SaveTemplateRequest | undefined = template && {
    name: template.name,
    goal: template.goal ?? '',
    items: template.items.map((item) => ({
      exerciseId: item.exercise.id,
      sets: item.sets,
      reps: item.reps,
      targetLoadKg: item.targetLoadKg,
      restSeconds: item.restSeconds,
      notes: item.notes ?? '',
    })),
  };

  return (
    <Card className="p-6">
      {catalog.isPending ? (
        <div className="flex justify-center p-6">
          <Spinner label="Cargando el catálogo de ejercicios" />
        </div>
      ) : catalog.isError ? (
        <Alert>{errorMessage(catalog.error)}</Alert>
      ) : (
        <div className="space-y-4">
          {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
          {save.isSuccess && template && <Alert tone="success">Plantilla guardada.</Alert>}
          <TemplateForm
            key={template?.updatedAt ?? 'nueva'}
            defaultValues={defaultValues}
            catalog={catalog.data.items}
            known={template?.items.map((item) => item.exercise)}
            submitLabel={template ? 'Guardar cambios' : 'Crear plantilla'}
            submitting={save.isPending}
            onCancel={() => void navigate({ to: '/plantillas' })}
            onSubmit={(values) =>
              save.mutate(
                { id: template?.id, values },
                {
                  onSuccess: (saved) => {
                    if (!template) {
                      void navigate({
                        to: '/plantillas/$templateId',
                        params: { templateId: saved.id },
                      });
                    }
                  },
                },
              )
            }
          />
        </div>
      )}
    </Card>
  );
}
