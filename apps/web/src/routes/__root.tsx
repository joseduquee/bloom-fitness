import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <Link to="/" className="mt-4 inline-block text-brand-700 underline">
        Volver al inicio
      </Link>
    </main>
  ),
});

function RootLayout() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-brand-900">
            <img src="/favicon.svg" alt="" className="size-7" />
            Bloom Fitness
          </Link>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
