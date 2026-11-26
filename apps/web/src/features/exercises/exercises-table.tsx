import { difficultyLabels, equipmentLabels, muscleGroupLabels, type Exercise } from '@bloom/shared';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ExerciseThumbnail } from './exercise-thumbnail';

interface ExercisesTableProps {
  exercises: Exercise[];
  onEdit: (exercise: Exercise) => void;
}

/** Catálogo de ejercicios (AC-003-05). */
export function ExercisesTable({ exercises, onEdit }: ExercisesTableProps) {
  if (exercises.length === 0) {
    return (
      <p className="p-10 text-center text-sm text-slate-500">
        No hay ejercicios que coincidan con la búsqueda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Catálogo de ejercicios</caption>
        <thead className="border-b border-slate-200 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">
              Ejercicio
            </th>
            <th scope="col" className="px-4 py-3">
              Músculo
            </th>
            <th scope="col" className="px-4 py-3">
              Equipamiento
            </th>
            <th scope="col" className="px-4 py-3">
              Dificultad
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {exercises.map((exercise) => (
            <tr key={exercise.id} className={exercise.isActive ? undefined : 'bg-slate-50'}>
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <ExerciseThumbnail
                    url={exercise.mediaUrl}
                    name={exercise.name}
                    className="size-12"
                  />
                  <span className="font-medium text-slate-900">{exercise.name}</span>
                  {!exercise.isActive && <Badge tone="neutral">Desactivado</Badge>}
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                {muscleGroupLabels[exercise.primaryMuscle]}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">{equipmentLabels[exercise.equipment]}</td>
              <td className="px-4 py-2 whitespace-nowrap">
                {difficultyLabels[exercise.difficulty]}
              </td>
              <td className="px-4 py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${exercise.name}`}
                  onClick={() => onEdit(exercise)}
                >
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
