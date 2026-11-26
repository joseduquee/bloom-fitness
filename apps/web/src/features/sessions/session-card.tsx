import { sessionStatusLabels, type TrainingSession } from '@bloom/shared';
import { Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/cn';
import { utcToMadrid } from '../../lib/dates';
import { fullName, shortName } from './people';

const statusTone = {
  SCHEDULED: 'brand',
  IN_PROGRESS: 'success',
  FINISHED: 'neutral',
  CANCELLED: 'danger',
} as const;

/** Sesión en la agenda. Al pulsarla se abre su detalle. */
export function SessionCard({
  session,
  compact = false,
  onOpen,
}: {
  session: TrainingSession;
  compact?: boolean;
  onOpen: (session: TrainingSession) => void;
}) {
  const start = utcToMadrid(session.startsAt).time;
  const end = utcToMadrid(session.endsAt).time;
  const cancelled = session.status === 'CANCELLED';

  return (
    <button
      type="button"
      onClick={() => onOpen(session)}
      className={cn(
        'w-full rounded-lg p-3 text-left text-sm ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
        cancelled
          ? 'bg-slate-50 text-slate-500 ring-slate-200'
          : 'bg-white ring-slate-200 hover:bg-brand-50 hover:ring-brand-600',
      )}
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn('font-semibold tabular-nums', cancelled && 'line-through')}>
          {start}–{end}
        </span>
        {session.status !== 'SCHEDULED' && (
          <Badge tone={statusTone[session.status]}>{sessionStatusLabels[session.status]}</Badge>
        )}
      </span>
      <span className="mt-1 block text-slate-600">Con {shortName(session.trainer)}</span>
      <span className="mt-1 flex items-start gap-1 text-slate-700">
        <Users className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{session.attendees.map(compact ? shortName : fullName).join(', ')}</span>
      </span>
    </button>
  );
}
