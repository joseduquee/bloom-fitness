import {
  sessionResponseSchema,
  type ActivateAccountRequest,
  type LoginRequest,
} from '@bloom/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { useSession } from './session-store';
import { closeLiveSocket } from '../../lib/socket';

export async function login(credentials: LoginRequest): Promise<void> {
  const session = await apiFetch('/auth/login', sessionResponseSchema, {
    method: 'POST',
    body: credentials,
    retryOnUnauthorized: false,
  });
  useSession.getState().setSession(session);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', z.undefined(), { method: 'POST', retryOnUnauthorized: false });
  } finally {
    closeLiveSocket();
    useSession.getState().clear();
    queryClient.clear();
  }
}

export async function activateAccount(input: ActivateAccountRequest): Promise<void> {
  await apiFetch('/auth/activate', z.undefined(), {
    method: 'POST',
    body: input,
    retryOnUnauthorized: false,
  });
}
