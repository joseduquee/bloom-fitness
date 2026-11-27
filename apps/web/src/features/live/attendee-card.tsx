import type {
  AdjustExerciseRequest,
  LiveAttendee,
  LiveExercise,
  LiveExerciseStatus,
  LogSetRequest,
  TemplateExerciseSummary,
  WorkoutTemplateSummary,
} from '@bloom/shared';
import { ChevronLeft, ChevronRight, SkipForward, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input, Select } from '../../components/ui/input';
import { errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { ExerciseThumbnail } from '../exercises/exercise-thumbnail';
import { fullName } from '../sessions/people';
import { useLiveAction, type LiveAction } from './api';
import { SetLogger } from './set-logger';

const statusDot: Record<LiveExerciseStatus, string> = {
  PENDING: 'bg-slate-300',
  COMPLETED: 'bg-emerald-500',
  SKIPPED: 'bg-amber-400',
};
const statusText = { PENDING: 'pendiente', COMPLETED: 'completado', SKIPPED: 'omitido' };

interface AttendeeCardProps {
  sessionId: string;
  attendee: LiveAttendee;
  templates: Pick<WorkoutTemplateSummary, 'id' | 'name'>[];
  catalog: TemplateExerciseSummary[];
  readOnly: boolean;
}

/** Tarjeta de un asistente en el panel: ejercicio en curso, series y acciones (HU-004-2 a HU-004-4). */
export function AttendeeCard({
  sessionId,
  attendee,
  templates,
  catalog,
  readOnly,
}: AttendeeCardProps) {
  const mutation = useLiveAction(sessionId);
  const [selectedSet, setSelectedSet] = useState<number | null>(null);
  const clientId = attendee.client.id;
  const absent = attendee.attendance === 'ABSENT';
  const current = attendee.exercises[attendee.currentIndex];
  const run = (action: LiveAction, onSuccess?: () => void) =>
    mutation.mutate(action, { onSuccess });

  return (
    <Card className={cn('flex flex-col', absent && 'opacity-70')}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{fullName(attendee.client)}</h2>
          <p className="text-sm text-slate-500">
            {attendee.template
              ? `${attendee.template.name}${attendee.routine ? ` · ${attendee.routine.name}, día ${attendee.routine.day}` : ''}`
              : 'Sin plantilla'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {absent && <Badge tone="danger">Ausente</Badge>}
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              disabled={mutation.isPending}
              onClick={() =>
                run({ type: 'attendance', clientId, attendance: absent ? 'PRESENT' : 'ABSENT' })
              }
            >
              {absent ? (
                <UserCheck className="size-4" aria-hidden="true" />
              ) : (
                <UserX className="size-4" aria-hidden="true" />
              )}
              {absent ? 'Marcar presente' : 'Marcar ausente'}
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4">
        {mutation.isError && mutation.variables?.type !== 'logSet' && (
          <Alert>{errorMessage(mutation.error)}</Alert>
        )}

        {attendee.exercises.length === 0 ? (
          <TemplatePicker
            templates={templates}
            disabled={readOnly || mutation.isPending}
            onPick={(templateId) => run({ type: 'template', clientId, templateId })}
          />
        ) : current ? (
          <>
            <ol className="flex gap-1.5" aria-label="Progreso">
              {attendee.exercises.map((exercise) => (
                <li
                  key={exercise.position}
                  title={`${exercise.exercise.name}: ${statusText[exercise.status]}`}
                  className={cn(
                    'h-2 flex-1 rounded-full',
                    statusDot[exercise.status],
                    exercise.position === attendee.currentIndex &&
                      'ring-2 ring-brand-700 ring-offset-1',
                  )}
                >
                  <span className="sr-only">
                    {exercise.position + 1}. {exercise.exercise.name}: {statusText[exercise.status]}
                  </span>
                </li>
              ))}
            </ol>

            <CurrentExercise
              exercise={current}
              index={attendee.currentIndex}
              total={attendee.exercises.length}
            />

            {current.logs.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Series registradas">
                {current.logs.map((log) => (
                  <li key={log.setNumber}>
                    <button
                      type="button"
                      disabled={readOnly || absent}
                      onClick={() => setSelectedSet(log.setNumber)}
                      className={cn(
                        'rounded-md bg-emerald-50 px-2 py-1 text-sm text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:cursor-default',
                        selectedSet === log.setNumber && 'ring-2 ring-brand-700',
                      )}
                    >
                      S{log.setNumber}: {log.weightKg} kg × {log.reps}
                      {log.rpe !== null && ` · RPE ${log.rpe}`}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!readOnly && !absent && (
              <ActiveControls
                key={`${current.position}-${current.exercise.id}`}
                current={current}
                selectedSet={selectedSet}
                catalog={catalog}
                saving={mutation.isPending}
                setError={
                  mutation.isError && mutation.variables?.type === 'logSet'
                    ? errorMessage(mutation.error)
                    : null
                }
                failedSet={
                  mutation.isError && mutation.variables?.type === 'logSet'
                    ? { setNumber: mutation.variables.setNumber, values: mutation.variables.body }
                    : null
                }
                onAction={(action, done) => run({ ...action, clientId } as LiveAction, done)}
                onSetSaved={() => setSelectedSet(null)}
              />
            )}
          </>
        ) : null}
      </div>

      {!readOnly && !absent && attendee.exercises.length > 0 && (
        <footer className="grid grid-cols-3 gap-2 border-t border-slate-200 p-4">
          <Button
            variant="secondary"
            disabled={mutation.isPending || attendee.currentIndex === 0}
            onClick={() => {
              setSelectedSet(null);
              run({ type: 'navigate', clientId, action: 'previous' });
            }}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Anterior
          </Button>
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => {
              setSelectedSet(null);
              run({ type: 'navigate', clientId, action: 'skip' });
            }}
          >
            <SkipForward className="size-4" aria-hidden="true" />
            Omitir
          </Button>
          <Button
            disabled={mutation.isPending || attendee.currentIndex === attendee.exercises.length - 1}
            onClick={() => {
              setSelectedSet(null);
              run({ type: 'navigate', clientId, action: 'next' });
            }}
          >
            Siguiente
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </footer>
      )}
    </Card>
  );
}

function CurrentExercise({
  exercise,
  index,
  total,
}: {
  exercise: LiveExercise;
  index: number;
  total: number;
}) {
  return (
    <div className="flex gap-4">
      <ExerciseThumbnail
        url={exercise.exercise.mediaUrl}
        name={exercise.exercise.name}
        className="size-24"
      />
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Ejercicio {index + 1} de {total}
          {exercise.status === 'SKIPPED' && ' · omitido'}
          {exercise.status === 'COMPLETED' && ' · completado'}
        </p>
        <p className="text-lg font-semibold text-slate-900">{exercise.exercise.name}</p>
        <p className="text-sm text-slate-700">
          {exercise.sets} × {exercise.reps}
          {exercise.targetLoadKg !== null && ` · ${exercise.targetLoadKg} kg`} · descanso{' '}
          {exercise.restSeconds} s
        </p>
        {exercise.originalExerciseId && (
          <p className="text-xs text-amber-700">Sustituido solo en esta sesión</p>
        )}
        {exercise.notes && <p className="text-sm text-slate-500">{exercise.notes}</p>}
      </div>
    </div>
  );
}

type AttendeeAction =
  | { type: 'logSet'; position: number; setNumber: number; body: LogSetRequest }
  | { type: 'adjust'; position: number; body: AdjustExerciseRequest };

/** Registro de series y ajustes del ejercicio en curso. Se reinicia al cambiar de ejercicio. */
function ActiveControls({
  current,
  selectedSet,
  catalog,
  saving,
  setError,
  failedSet,
  onAction,
  onSetSaved,
}: {
  current: LiveExercise;
  selectedSet: number | null;
  catalog: TemplateExerciseSummary[];
  saving: boolean;
  setError: string | null;
  failedSet: { setNumber: number; values: LogSetRequest } | null;
  onAction: (action: AttendeeAction, done?: () => void) => void;
  onSetSaved: () => void;
}) {
  const nextSet = Math.min(current.logs.length + 1, current.sets);
  const allDone = current.logs.length >= current.sets;
  const setNumber = selectedSet ?? nextSet;
  const [adjusting, setAdjusting] = useState(false);
  const [load, setLoad] = useState(current.targetLoadKg?.toString() ?? '');

  return (
    <div className="space-y-3">
      {allDone && selectedSet === null ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          Todas las series registradas. Pulsa una serie para corregirla o pasa al siguiente
          ejercicio.
        </p>
      ) : (
        <SetLogger
          key={`${current.position}-${setNumber}-${current.logs.length}`}
          exercise={current}
          setNumber={setNumber}
          saving={saving}
          error={setError}
          failedValues={failedSet?.setNumber === setNumber ? failedSet.values : null}
          onSave={(body) =>
            onAction({ type: 'logSet', position: current.position, setNumber, body }, onSetSaved)
          }
        />
      )}

      <button
        type="button"
        className="text-sm font-medium text-brand-700 hover:underline"
        aria-expanded={adjusting}
        onClick={() => setAdjusting((value) => !value)}
      >
        {adjusting ? 'Ocultar ajustes' : 'Cambiar carga o ejercicio'}
      </button>
      {adjusting && (
        <div className="space-y-3 rounded-lg bg-slate-50 p-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onAction({
                type: 'adjust',
                position: current.position,
                body: { targetLoadKg: load === '' ? null : Number(load) },
              });
            }}
          >
            <label className="flex-1 space-y-1">
              <span className="block text-xs font-medium text-slate-600">Carga objetivo (kg)</span>
              <Input
                type="number"
                inputMode="decimal"
                step={0.25}
                min={0}
                value={load}
                onChange={(event) => setLoad(event.target.value)}
              />
            </label>
            <Button type="submit" variant="secondary" disabled={saving}>
              Cambiar carga
            </Button>
          </form>
          <label className="block space-y-1">
            <span className="block text-xs font-medium text-slate-600">Sustituir ejercicio</span>
            <Select
              value=""
              disabled={saving || current.logs.length > 0}
              onChange={(event) => {
                if (event.target.value) {
                  onAction({
                    type: 'adjust',
                    position: current.position,
                    body: { exerciseId: event.target.value },
                  });
                }
              }}
            >
              <option value="">
                {current.logs.length > 0
                  ? 'Ya tiene series: no se puede sustituir'
                  : 'Elige el ejercicio nuevo…'}
              </option>
              {catalog
                .filter((exercise) => exercise.id !== current.exercise.id)
                .map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
            </Select>
          </label>
          <p className="text-xs text-slate-500">Los cambios solo afectan a esta sesión.</p>
        </div>
      )}
    </div>
  );
}

function TemplatePicker({
  templates,
  disabled,
  onPick,
}: {
  templates: Pick<WorkoutTemplateSummary, 'id' | 'name'>[];
  disabled: boolean;
  onPick: (templateId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">Este asistente no tiene plantilla para hoy.</p>
      <Select
        aria-label="Asignar plantilla"
        value=""
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value) onPick(event.target.value);
        }}
      >
        <option value="">Asignar plantilla…</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
