import {
  liveSessionSchema,
  startPlanSchema,
  type AdjustExerciseRequest,
  type Attendance,
  type LiveSession,
  type LogSetRequest,
  type NavigateRequest,
  type StartSessionRequest,
} from '@bloom/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { sessionsKeys } from '../sessions/api';

export const liveKeys = {
  session: (id: string) => ['live-session', id] as const,
  startPlan: (id: string) => ['live-session', id, 'start-plan'] as const,
};

export const liveSessionQuery = (id: string) =>
  queryOptions({
    queryKey: liveKeys.session(id),
    queryFn: () => apiFetch(`/sessions/${id}/live`, liveSessionSchema),
  });

export const startPlanQuery = (id: string) =>
  queryOptions({
    queryKey: liveKeys.startPlan(id),
    queryFn: () => apiFetch(`/sessions/${id}/start-plan`, startPlanSchema),
  });

/** Acciones sobre la sesión en curso. Todas devuelven la instantánea completa. */
export type LiveAction =
  | { type: 'start'; body: StartSessionRequest }
  | { type: 'finish' }
  | { type: 'template'; clientId: string; templateId: string }
  | { type: 'attendance'; clientId: string; attendance: Attendance }
  | { type: 'navigate'; clientId: string; action: NavigateRequest['action'] }
  | { type: 'logSet'; clientId: string; position: number; setNumber: number; body: LogSetRequest }
  | { type: 'adjust'; clientId: string; position: number; body: AdjustExerciseRequest };

function request(id: string, action: LiveAction): { path: string; method: string; body?: unknown } {
  const attendee = (clientId: string) => `/sessions/${id}/attendees/${clientId}`;
  switch (action.type) {
    case 'start':
      return { path: `/sessions/${id}/start`, method: 'POST', body: action.body };
    case 'finish':
      return { path: `/sessions/${id}/finish`, method: 'POST' };
    case 'template':
      return {
        path: `${attendee(action.clientId)}/template`,
        method: 'PUT',
        body: { templateId: action.templateId },
      };
    case 'attendance':
      return {
        path: `${attendee(action.clientId)}/attendance`,
        method: 'PUT',
        body: { attendance: action.attendance },
      };
    case 'navigate':
      return {
        path: `${attendee(action.clientId)}/navigate`,
        method: 'POST',
        body: { action: action.action },
      };
    case 'logSet':
      return {
        path: `${attendee(action.clientId)}/exercises/${action.position}/sets/${action.setNumber}`,
        method: 'PUT',
        body: action.body,
      };
    case 'adjust':
      return {
        path: `${attendee(action.clientId)}/exercises/${action.position}`,
        method: 'PATCH',
        body: action.body,
      };
  }
}

/**
 * Una instancia por asistente (constitución §5.2): cada tarjeta tiene su propio estado de carga y error.
 * La respuesta sustituye la instantánea guardada.
 */
export function useLiveAction(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: LiveAction) => {
      const { path, method, body } = request(sessionId, action);
      return apiFetch(path, liveSessionSchema, { method, body });
    },
    onSuccess: (snapshot: LiveSession) => {
      queryClient.setQueryData(liveKeys.session(sessionId), snapshot);
      return queryClient.invalidateQueries({ queryKey: sessionsKeys.all });
    },
  });
}
