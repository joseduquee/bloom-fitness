import { memberImportListSchema, memberImportSchema } from '@bloom/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { usersKeys } from '../users/api';

export const memberImportsKeys = {
  all: ['member-imports'] as const,
};

export const memberImportsQuery = () =>
  queryOptions({
    queryKey: memberImportsKeys.all,
    queryFn: () => apiFetch('/member-imports', memberImportListSchema),
  });

/** Lanza una importación. Tanto si va bien como si falla, el histórico y los usuarios cambian. */
export function useRunImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch('/member-imports', memberImportSchema, { method: 'POST' }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: memberImportsKeys.all }),
        queryClient.invalidateQueries({ queryKey: usersKeys.all }),
      ]),
  });
}
