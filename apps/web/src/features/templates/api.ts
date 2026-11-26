import {
  workoutTemplateListSchema,
  workoutTemplateSchema,
  type ListTemplatesQuery,
  type SaveTemplateRequest,
} from '@bloom/shared';
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '../../lib/api';
import { toSearchParams } from '../../lib/search-params';

export const templatesKeys = {
  all: ['templates'] as const,
  list: (query: ListTemplatesQuery) => [...templatesKeys.all, 'list', query] as const,
  detail: (id: string) => [...templatesKeys.all, 'detail', id] as const,
};

export const templatesListQuery = (query: ListTemplatesQuery) =>
  queryOptions({
    queryKey: templatesKeys.list(query),
    queryFn: () => apiFetch(`/templates${toSearchParams(query)}`, workoutTemplateListSchema),
    placeholderData: keepPreviousData,
  });

export const templateQuery = (id: string) =>
  queryOptions({
    queryKey: templatesKeys.detail(id),
    queryFn: () => apiFetch(`/templates/${id}`, workoutTemplateSchema),
  });

export function useSaveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: SaveTemplateRequest }) =>
      id
        ? apiFetch(`/templates/${id}`, workoutTemplateSchema, { method: 'PUT', body: values })
        : apiFetch('/templates', workoutTemplateSchema, { method: 'POST', body: values }),
    onSuccess: (template) => {
      queryClient.setQueryData(templatesKeys.detail(template.id), template);
      return queryClient.invalidateQueries({ queryKey: [...templatesKeys.all, 'list'] });
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/templates/${id}/duplicate`, workoutTemplateSchema, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...templatesKeys.all, 'list'] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/templates/${id}`, z.undefined(), { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKeys.all }),
  });
}
