import type { LiveSession } from '@bloom/shared';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { fullName } from '../sessions/people';

const statusLabel = { PENDING: 'Pendiente', COMPLETED: 'Completado', SKIPPED: 'Omitido' } as const;
const statusTone = { PENDING: 'neutral', COMPLETED: 'success', SKIPPED: 'warning' } as const;

/** Resumen de una sesión finalizada (AC-004-08): lo que hizo cada asistente. */
export function SessionSummary({ session }: { session: LiveSession }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {session.attendees.map((attendee) => (
        <Card key={attendee.client.id}>
          <header className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900">{fullName(attendee.client)}</h2>
            <p className="text-sm text-slate-500">
              {attendee.attendance === 'ABSENT'
                ? 'No asistió'
                : (attendee.template?.name ?? 'Sin plantilla')}
            </p>
          </header>
          {attendee.attendance === 'PRESENT' && attendee.exercises.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {attendee.exercises.map((exercise) => (
                <li key={exercise.position} className="space-y-1 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{exercise.exercise.name}</span>
                    <Badge tone={statusTone[exercise.status]}>{statusLabel[exercise.status]}</Badge>
                  </div>
                  <p className="text-slate-600">
                    {exercise.logs.length === 0
                      ? 'Sin series registradas'
                      : exercise.logs.map((log) => `${log.weightKg} kg × ${log.reps}`).join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
