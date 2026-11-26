import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-brand-700 underline">
        Volver al inicio
      </Link>
    </main>
  ),
});
