import { DEFAULT_SESSION_MAX_ATTENDEES, Role, type TrainingSession } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Spinner } from '../../components/ui/spinner';
import { Page } from '../../components/page';
import { requireRole } from '../../features/auth/require-role';
import { sessionsListQuery } from '../../features/sessions/api';
import { SessionCard } from '../../features/sessions/session-card';
import { SessionDialog } from '../../features/sessions/session-dialog';
import { errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import {
  addDays,
  formatLongDay,
  formatWeekday,
  madridToUtcIso,
  startOfWeek,
  today,
  utcToMadrid,
} from '../../lib/dates';

const searchSchema = z.object({
  vista: z.enum(['dia', 'semana']).optional().catch(undefined),
  fecha: z.iso.date().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/agenda')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: AgendaPage,
});

/** Agenda de sesiones del centro en vista diaria o semanal (AC-004-03). */
function AgendaPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const view = search.vista ?? 'semana';
  const day = search.fecha ?? today();
  const first = view === 'semana' ? startOfWeek(day) : day;
  const days = view === 'semana' ? Array.from({ length: 7 }, (_, i) => addDays(first, i)) : [day];
  const step = view === 'semana' ? 7 : 1;

  const { data, isPending, isError, error, isFetching } = useQuery(
    sessionsListQuery({
      from: madridToUtcIso(first, '00:00'),
      to: madridToUtcIso(addDays(first, days.length), '00:00'),
    }),
  );
  const [open, setOpen] = useState<TrainingSession | 'new' | null>(null);

  const go = (changes: z.infer<typeof searchSchema>) =>
    void navigate({ search: (prev) => ({ ...prev, ...changes }), replace: true });
  const sessionsOf = (date: string) =>
    (data?.items ?? []).filter((session) => utcToMadrid(session.startsAt).day === date);

  const title =
    view === 'semana'
      ? `Semana del ${formatWeekday(first)} al ${formatWeekday(addDays(first, 6))}`
      : formatLongDay(day);

  return (
    <Page
      title="Agenda"
      description="Sesiones del centro. Las horas son de Madrid."
      actions={
        <Button onClick={() => setOpen('new')}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva sesión
        </Button>
      }
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              aria-label={view === 'semana' ? 'Semana anterior' : 'Día anterior'}
              onClick={() => go({ fecha: addDays(day, -step) })}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => go({ fecha: undefined })}>
              Hoy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              aria-label={view === 'semana' ? 'Semana siguiente' : 'Día siguiente'}
              onClick={() => go({ fecha: addDays(day, step) })}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <h2 className="flex-1 text-base font-semibold text-slate-900 first-letter:uppercase">
            {title}
          </h2>
          {isFetching && !isPending && <Spinner className="text-slate-400" label="Actualizando" />}
          <div
            role="group"
            aria-label="Vista"
            className="inline-flex rounded-lg ring-1 ring-slate-300"
          >
            {(['dia', 'semana'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => go({ vista: option })}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium first:rounded-l-lg last:rounded-r-lg focus-visible:outline-2 focus-visible:outline-brand-700',
                  view === option ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                {option === 'dia' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <div className="flex justify-center p-10">
            <Spinner label="Cargando la agenda" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert>{errorMessage(error)}</Alert>
          </div>
        ) : view === 'semana' ? (
          <div className="grid gap-px bg-slate-200 md:grid-cols-7">
            {days.map((date) => (
              <section
                key={date}
                aria-label={formatLongDay(date)}
                className={cn('min-h-40 space-y-2 bg-white p-2', date === today() && 'bg-brand-50')}
              >
                <h3 className="px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <button
                    type="button"
                    className="hover:text-brand-700 hover:underline"
                    onClick={() => go({ vista: 'dia', fecha: date })}
                  >
                    {formatWeekday(date)}
                  </button>
                </h3>
                {sessionsOf(date).map((session) => (
                  <SessionCard key={session.id} session={session} compact onOpen={setOpen} />
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {sessionsOf(day).length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No hay sesiones este día.</p>
            ) : (
              sessionsOf(day).map((session) => (
                <SessionCard key={session.id} session={session} onOpen={setOpen} />
              ))
            )}
          </div>
        )}
      </Card>

      {open !== null && (
        <SessionDialog
          session={open === 'new' ? null : open}
          defaultDay={day}
          maxAttendees={data?.maxAttendees ?? DEFAULT_SESSION_MAX_ATTENDEES}
          onClose={() => setOpen(null)}
        />
      )}
    </Page>
  );
}
