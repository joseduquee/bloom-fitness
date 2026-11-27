import type { StartPlan, StartSessionRequest, WorkoutTemplateSummary } from '@bloom/shared';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Select } from '../../components/ui/input';
import { fullName } from '../sessions/people';

interface StartPlannerProps {
  plan: StartPlan;
  templates: Pick<WorkoutTemplateSummary, 'id' | 'name'>[];
  starting: boolean;
  onStart: (request: StartSessionRequest) => void;
}

/** Antes de iniciar: plantilla propuesta para cada asistente, que se puede cambiar (AC-004-04). */
export function StartPlanner({ plan, templates, starting, onStart }: StartPlannerProps) {
  const [chosen, setChosen] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      plan.attendees.map((attendee) => [attendee.client.id, attendee.proposedTemplateId ?? '']),
    ),
  );

  return (
    <Card>
      <ul className="divide-y divide-slate-100">
        {plan.attendees.map((attendee) => {
          const routineIds = new Set(attendee.routine?.templates.map((t) => t.id));
          const others = templates.filter((template) => !routineIds.has(template.id));
          const proposed = attendee.routine?.templates.find(
            (template) => template.position === attendee.proposedPosition,
          );
          return (
            <li key={attendee.client.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_20rem]">
              <div>
                <p className="font-medium text-slate-900">{fullName(attendee.client)}</p>
                <p className="text-sm text-slate-500">
                  {attendee.routine && proposed
                    ? `${attendee.routine.name}: toca el día ${String.fromCharCode(65 + proposed.position)} (${proposed.name})`
                    : 'Sin rutina activa: elige una plantilla o déjalo sin ella'}
                </p>
              </div>
              <Select
                aria-label={`Plantilla de ${fullName(attendee.client)}`}
                value={chosen[attendee.client.id] ?? ''}
                onChange={(event) =>
                  setChosen((current) => ({ ...current, [attendee.client.id]: event.target.value }))
                }
              >
                <option value="">Sin plantilla</option>
                {attendee.routine && (
                  <optgroup label={`Rutina: ${attendee.routine.name}`}>
                    {attendee.routine.templates.map((template) => (
                      <option key={`${template.position}-${template.id}`} value={template.id}>
                        Día {String.fromCharCode(65 + template.position)} · {template.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Otras plantillas">
                  {others.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end border-t border-slate-200 p-4">
        <Button
          size="lg"
          loading={starting}
          onClick={() =>
            onStart({
              assignments: plan.attendees.map((attendee) => ({
                clientId: attendee.client.id,
                templateId: chosen[attendee.client.id] || null,
              })),
            })
          }
        >
          <Play className="size-4" aria-hidden="true" />
          Iniciar sesión
        </Button>
      </div>
    </Card>
  );
}
