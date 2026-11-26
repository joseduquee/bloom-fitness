import {
  routineListSchema,
  routineSchema,
  type CreateRoutineRequest,
  type SaveRoutineRequest,
} from '@bloom/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export const routinesKeys = {
  all: ['routines'] as const,
  forClient: (clientId: string) => [...routinesKeys.all, 'client', clientId] as const,
  detail: (id: string) => [...routinesKeys.all, 'detail', id] as const,
};

export const clientRoutinesQuery = (clientId: string) =>
  queryOptions({
    queryKey: routinesKeys.forClient(clientId),
    queryFn: () => apiFetch(`/clients/${clientId}/routines`, routineListSchema),
  });

export const routineQuery = (id: string) =>
  queryOptions({
    queryKey: routinesKeys.detail(id),
    queryFn: () => apiFetch(`/routines/${id}`, routineSchema),
  });

export function useCreateRoutine(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateRoutineRequest) =>
      apiFetch(`/clients/${clientId}/routines`, routineSchema, { method: 'POST', body: values }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routinesKeys.forClient(clientId) }),
  });
}

export function useUpdateRoutine(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: SaveRoutineRequest) =>
      apiFetch(`/routines/${id}`, routineSchema, { method: 'PUT', body: values }),
    onSuccess: (routine) => {
      queryClient.setQueryData(routinesKeys.detail(id), routine);
      return queryClient.invalidateQueries({ queryKey: routinesKeys.forClient(routine.clientId) });
    },
  });
}

/** AC-003-13: activar cambia también la rutina que estaba activa, así que se recarga la lista. */
export function useSetRoutineActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/routines/${id}/${active ? 'activate' : 'deactivate'}`, routineSchema, {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routinesKeys.all }),
  });
}
