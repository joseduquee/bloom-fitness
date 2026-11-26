import { createFileRoute } from '@tanstack/react-router';
import { ApiStatus } from '../components/api-status';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Seguimiento de entrenamientos en tiempo real
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Planifica rutinas, dirige las sesiones y muestra a cada cliente lo que le toca en las
        pantallas de la sala.
      </p>
      <div className="mt-6">
        <ApiStatus />
      </div>
    </main>
  );
}
