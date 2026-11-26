import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { refreshSession } from './lib/api';
import { queryClient } from './lib/query-client';
import { routeTree } from './routeTree.gen';
import './styles.css';

const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');

// Antes de pintar, se intenta recuperar la sesión con la cookie de refresco.
void refreshSession().finally(() => {
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
});
