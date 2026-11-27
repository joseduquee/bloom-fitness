import { cn } from '../../lib/cn';
import type { LiveConnection } from './use-live-socket';

const labels: Record<LiveConnection, string> = {
  connecting: 'Conectando…',
  live: 'En directo',
  reconnecting: 'Reconectando…',
  offline: 'Sin conexión en directo',
};

const dots: Record<LiveConnection, string> = {
  connecting: 'bg-slate-400',
  live: 'bg-emerald-500',
  reconnecting: 'bg-amber-500 animate-pulse',
  offline: 'bg-red-500',
};

/** Estado del canal en tiempo real. Se anuncia a los lectores de pantalla cuando cambia. */
export function ConnectionBadge({ state }: { state: LiveConnection }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', dots[state])} />
      {labels[state]}
    </span>
  );
}
