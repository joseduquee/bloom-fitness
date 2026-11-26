import type { ReactNode } from 'react';

/** Marco de las pantallas públicas (acceso y activación). */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-brand-900 p-12 text-brand-50 lg:flex">
        <div className="flex items-center gap-3 text-xl font-semibold">
          <img src="/favicon.svg" alt="" className="size-9" />
          Bloom Fitness
        </div>
        <div>
          <p className="text-3xl leading-tight font-semibold">
            Cada cliente sabe qué le toca.
            <br />
            Tú te centras en entrenar.
          </p>
          <p className="mt-4 max-w-md text-brand-100">
            Planifica rutinas, registra cada serie y muestra la sesión en las pantallas de la sala
            en tiempo real.
          </p>
        </div>
        <p className="text-sm text-brand-100">© {new Date().getFullYear()} Bloom Fitness</p>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-brand-900 lg:hidden">
            <img src="/favicon.svg" alt="" className="size-8" />
            Bloom Fitness
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
