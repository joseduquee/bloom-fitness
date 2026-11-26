import {
  sessionListSchema,
  trainingSessionSchema,
  type ListSessionsQuery,
  type SaveSessionRequest,
} from '@bloom/shared';
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { toSearchParams } from '../../lib/search-params';

export const sessionsKeys = {
  all: ['sessions'] as const,
  list: (query: ListSessionsQuery) => [...sessionsKeys.all, 'list', query] as const,
};

export const sessionsListQuery = (query: ListSessionsQuery) =>
  queryOptions({
    queryKey: sessionsKeys.list(query),
    queryFn: () => apiFetch(`/sessions${toSearchParams(query)}`, sessionListSchema),
    placeholderData: keepPreviousData,
  });

export function useSaveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: SaveSessionRequest }) =>
      id
        ? apiFetch(`/sessions/${id}`, trainingSessionSchema, { method: 'PUT', body: values })
        : apiFetch('/sessions', trainingSessionSchema, { method: 'POST', body: values }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKeys.all }),
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/sessions/${id}/cancel`, trainingSessionSchema, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsKeys.all }),
  });
}
