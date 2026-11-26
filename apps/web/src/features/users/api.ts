import {
  activationLinkResponseSchema,
  createUserResponseSchema,
  userListSchema,
  userSchema,
  type CreateUserRequest,
  type ListUsersQuery,
  type UpdateUserRequest,
} from '@bloom/shared';
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { toSearchParams } from '../../lib/search-params';

export const usersKeys = {
  all: ['users'] as const,
  list: (query: ListUsersQuery) => [...usersKeys.all, 'list', query] as const,
  detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
};

export const usersListQuery = (query: ListUsersQuery) =>
  queryOptions({
    queryKey: usersKeys.list(query),
    queryFn: () => apiFetch(`/users${toSearchParams(query)}`, userListSchema),
    placeholderData: keepPreviousData,
  });

export const userQuery = (id: string) =>
  queryOptions({
    queryKey: usersKeys.detail(id),
    queryFn: () => apiFetch(`/users/${id}`, userSchema),
  });

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserRequest) =>
      apiFetch('/users', createUserResponseSchema, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserRequest) =>
      apiFetch(`/users/${id}`, userSchema, { method: 'PATCH', body: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(usersKeys.detail(id), user);
      return queryClient.invalidateQueries({ queryKey: [...usersKeys.all, 'list'] });
    },
  });
}

/** Activar o desactivar. Se usa por fila: la tabla sabe qué usuario está en curso. */
export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/users/${id}/${active ? 'reactivate' : 'deactivate'}`, userSchema, {
        method: 'POST',
      }),
    onSuccess: (user) => {
      queryClient.setQueryData(usersKeys.detail(user.id), user);
      return queryClient.invalidateQueries({ queryKey: [...usersKeys.all, 'list'] });
    },
  });
}

export function useActivationLink() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/users/${id}/activation-link`, activationLinkResponseSchema, { method: 'POST' }),
  });
}
