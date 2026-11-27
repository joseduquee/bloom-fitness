import type { ScreenSession } from '@bloom/shared';
import { Dumbbell, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import { presentAttendees, type TvState } from './tv-state';

type Attendee = ScreenSession['attendees'][number];

const clockFormat = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Madrid',
});
const dateFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Madrid',
});

function useNow(intervalMs = 10_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Reparto de las tarjetas para que quepan en 1920×1080 sin desbordar (AC-005-07). */
export function gridFor(count: number): string {
  if (count <= 1) return 'grid-cols-1 grid-rows-1';
  if (count === 2) return 'grid-cols-2 grid-rows-1';
  if (count === 3) return 'grid-cols-3 grid-rows-1';
  if (count === 4) return 'grid-cols-2 grid-rows-2';
  return 'grid-cols-3 grid-rows-2';
}

/**
 * Pantalla de sala (HU-005-2). Fondo oscuro y texto principal de al menos 48 px para leerse a 4 m
 * con contraste AA (AC-005-08).
 */
export function TvDisplay({ state }: { state: TvState }) {
  const now = useNow();
  const attendees = presentAttendees(state);
  const offline = state.connection === 'reconnecting' || state.connection === 'connecting';

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between px-10 py-5">
        <p className="text-3xl font-semibold text-emerald-300">
          {state.center?.name ?? 'Bloom Fitness'}
        </p>
        <div className="flex items-center gap-6">
          {offline && (
            <p
              role="status"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-4 py-2 text-xl text-amber-200"
            >
              <WifiOff className="size-6" aria-hidden="true" />
              {state.connection === 'connecting' ? 'Conectando…' : 'Reconectando…'}
            </p>
          )}
          <p className="text-4xl font-semibold tabular-nums">{clockFormat.format(now)}</p>
        </div>
      </header>

      {attendees.length === 0 ? (
        <IdleView centerName={state.center?.name ?? 'Bloom Fitness'} now={now} />
      ) : (
        <main
          className={cn('grid min-h-0 flex-1 gap-6 px-10 pb-10', gridFor(attendees.length))}
          aria-label="Entrenamiento en curso"
        >
          {attendees.map((attendee) => (
            <AttendeeTile key={attendee.key} attendee={attendee} compact={attendees.length > 2} />
          ))}
        </main>
      )}
    </div>
  );
}

/** AC-005-05: sin sesión en curso, nombre del centro y hora. */
function IdleView({ centerName, now }: { centerName: string; now: Date }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="text-[10rem] leading-none font-bold tabular-nums">{clockFormat.format(now)}</p>
      <p className="text-5xl text-slate-200 first-letter:uppercase">{dateFormat.format(now)}</p>
      <p className="mt-8 text-6xl font-semibold text-emerald-300">{centerName}</p>
      <p className="text-4xl text-slate-300">No hay ninguna sesión en curso</p>
    </main>
  );
}

/** AC-005-06: alias, ejercicio, GIF, serie actual de total, repeticiones y carga. */
function AttendeeTile({ attendee, compact }: { attendee: Attendee; compact: boolean }) {
  const current = attendee.current;
  const done = current ? current.setsDone >= current.sets : false;
  const setLabel = current
    ? done
      ? 'Completado'
      : `Serie ${current.setsDone + 1} de ${current.sets}`
    : null;

  return (
    <article className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-slate-900 ring-1 ring-slate-700">
      <header className="flex shrink-0 items-baseline justify-between gap-4 px-8 pt-6">
        <h2 className="truncate text-6xl font-bold">{attendee.displayName}</h2>
        {attendee.templateName && (
          <p className="truncate text-2xl text-slate-300">{attendee.templateName}</p>
        )}
      </header>

      {current ? (
        <>
          <div className="relative mx-8 mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-800">
            {current.mediaUrl ? (
              <img
                src={current.mediaUrl}
                alt={`Demostración: ${current.name}`}
                className="absolute inset-0 size-full object-contain"
              />
            ) : (
              <Dumbbell
                className="absolute inset-0 m-auto size-1/3 text-slate-600"
                aria-hidden="true"
              />
            )}
          </div>
          <footer className="shrink-0 space-y-3 px-8 py-6">
            <p className={cn('truncate font-semibold', compact ? 'text-5xl' : 'text-6xl')}>
              {current.name}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-5xl">
              <span className={cn('font-bold', done ? 'text-emerald-300' : 'text-amber-200')}>
                {setLabel}
              </span>
              <span>{current.reps} reps</span>
              {current.targetLoadKg !== null && (
                <span className="tabular-nums">{current.targetLoadKg} kg</span>
              )}
            </div>
            {current.lastSet && (
              <p className="text-2xl text-slate-300">
                Última serie: {current.lastSet.weightKg} kg × {current.lastSet.reps}
              </p>
            )}
            <ol className="flex gap-2" aria-label="Progreso de la sesión">
              {attendee.progress.map((status, index) => (
                <li
                  key={index}
                  className={cn(
                    'h-3 flex-1 rounded-full',
                    status === 'COMPLETED' && 'bg-emerald-400',
                    status === 'SKIPPED' && 'bg-amber-400',
                    status === 'PENDING' && 'bg-slate-700',
                    index === current.index && 'ring-4 ring-white/80',
                  )}
                />
              ))}
            </ol>
          </footer>
        </>
      ) : (
        <p className="flex flex-1 items-center justify-center p-8 text-4xl text-slate-300">
          Sin entrenamiento asignado
        </p>
      )}
    </article>
  );
}
