import {
  pairingCodeSchema,
  screenListSchema,
  screenSchema,
  type CreateScreenRequest,
} from '@bloom/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export const screensKeys = { all: ['screens'] as const };

export const screensQuery = () =>
  queryOptions({
    queryKey: screensKeys.all,
    queryFn: () => apiFetch('/screens', screenListSchema),
    // La última conexión cambia sola: se refresca cada medio minuto mientras la página está abierta.
    refetchInterval: 30_000,
  });

export function useCreateScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateScreenRequest) =>
      apiFetch('/screens', pairingCodeSchema, { method: 'POST', body: values }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: screensKeys.all }),
  });
}

export function useNewPairingCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/screens/${id}/pairing-code`, pairingCodeSchema, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: screensKeys.all }),
  });
}

export function useRevokeScreen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/screens/${id}/revoke`, screenSchema, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: screensKeys.all }),
  });
}
