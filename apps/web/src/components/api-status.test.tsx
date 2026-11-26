import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiStatus } from './api-status';

function renderWithQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApiStatus />
    </QueryClientProvider>,
  );
}

describe('ApiStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el servidor operativo y su versión', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ status: 'ok', version: '1.0.0', uptimeSeconds: 5, database: 'up' }),
          ),
        ),
    );
    renderWithQuery();
    expect(await screen.findByText('Servidor operativo · v1.0.0')).toBeInTheDocument();
  });

  it('avisa cuando el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderWithQuery();
    expect(await screen.findByText('Servidor no disponible')).toBeInTheDocument();
  });
});
