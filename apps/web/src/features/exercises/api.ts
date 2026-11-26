import {
  exerciseListSchema,
  exerciseSchema,
  type CreateExerciseRequest,
  type ListExercisesQuery,
  type UpdateExerciseRequest,
} from '@bloom/shared';
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { toSearchParams } from '../../lib/search-params';

export const exercisesKeys = {
  all: ['exercises'] as const,
  list: (query: ListExercisesQuery) => [...exercisesKeys.all, 'list', query] as const,
};

export const exercisesListQuery = (query: ListExercisesQuery) =>
  queryOptions({
    queryKey: exercisesKeys.list(query),
    queryFn: () => apiFetch(`/exercises${toSearchParams(query)}`, exerciseListSchema),
    placeholderData: keepPreviousData,
  });

interface SaveExerciseInput {
  id?: string;
  values: CreateExerciseRequest | UpdateExerciseRequest;
  /** GIF nuevo; `null` lo quita y `undefined` lo deja como está. */
  media?: File | null;
}

/**
 * Crea o edita un ejercicio y, si hace falta, sube o quita su GIF.
 * Son dos peticiones: si la segunda falla, el ejercicio ya está guardado y el error lo indica.
 */
export function useSaveExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values, media }: SaveExerciseInput) => {
      let exercise = id
        ? await apiFetch(`/exercises/${id}`, exerciseSchema, { method: 'PATCH', body: values })
        : await apiFetch('/exercises', exerciseSchema, { method: 'POST', body: values });
      if (media) {
        const form = new FormData();
        form.append('file', media);
        exercise = await apiFetch(`/exercises/${exercise.id}/media`, exerciseSchema, {
          method: 'PUT',
          body: form,
        });
      } else if (media === null && exercise.mediaUrl) {
        exercise = await apiFetch(`/exercises/${exercise.id}/media`, exerciseSchema, {
          method: 'DELETE',
        });
      }
      return exercise;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: exercisesKeys.all }),
  });
}

export function useSetExerciseActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/exercises/${id}/${active ? 'reactivate' : 'deactivate'}`, exerciseSchema, {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exercisesKeys.all }),
  });
}
