import type { TemplateExerciseSummary } from '@bloom/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TemplateForm } from './template-form';

const exercise = (id: string, name: string, overrides: Partial<TemplateExerciseSummary> = {}) => ({
  id,
  name,
  primaryMuscle: 'QUADRICEPS' as const,
  equipment: 'BARBELL' as const,
  mediaUrl: null,
  isActive: true,
  ...overrides,
});

const squat = exercise('11111111-1111-4111-8111-111111111111', 'Sentadilla');
const bench = exercise('22222222-2222-4222-8222-222222222222', 'Press de banca', {
  primaryMuscle: 'CHEST',
});
const legacy = exercise('33333333-3333-4333-8333-333333333333', 'Prensa antigua', {
  isActive: false,
});

const rowNames = () =>
  within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('span.flex-1')?.textContent);

describe('TemplateForm', () => {
  it('AC-003-07 y AC-003-08: crea una plantilla con ejercicios, series, repeticiones, carga y descanso', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TemplateForm
        catalog={[squat, bench]}
        submitLabel="Crear plantilla"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Nombre'), 'Día A');
    await user.selectOptions(screen.getByLabelText('Añadir ejercicio'), 'Sentadilla');
    await user.selectOptions(screen.getByLabelText('Añadir ejercicio'), 'Press de banca');
    const first = within(screen.getAllByRole('listitem')[0] as HTMLElement);
    await user.clear(first.getByLabelText('Series'));
    await user.type(first.getByLabelText('Series'), '5');
    await user.clear(first.getByLabelText('Repeticiones'));
    await user.type(first.getByLabelText('Repeticiones'), '5');
    await user.type(first.getByLabelText('Carga (kg)'), '82.5');
    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: 'Día A',
        goal: null,
        items: [
          {
            exerciseId: squat.id,
            sets: 5,
            reps: '5',
            targetLoadKg: 82.5,
            restSeconds: 90,
            notes: null,
          },
          {
            exerciseId: bench.id,
            sets: 3,
            reps: '10',
            targetLoadKg: null,
            restSeconds: 90,
            notes: null,
          },
        ],
      },
      expect.anything(),
    );
  });

  it('AC-003-09: reordena y quita ejercicios', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TemplateForm
        catalog={[squat, bench]}
        defaultValues={{
          name: 'Día A',
          items: [
            { exerciseId: squat.id, sets: 4, reps: '8', restSeconds: 90 },
            { exerciseId: bench.id, sets: 3, reps: '10', restSeconds: 60 },
          ],
        }}
        submitLabel="Guardar cambios"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Bajar Sentadilla' }));
    expect(rowNames()).toEqual(['Press de banca', 'Sentadilla']);
    await user.click(screen.getByRole('button', { name: 'Quitar Press de banca' }));
    expect(rowNames()).toEqual(['Sentadilla']);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSubmit.mock.calls[0]?.[0].items).toEqual([
      expect.objectContaining({ exerciseId: squat.id, sets: 4 }),
    ]);
  });

  it('AC-003-08: muestra los errores de cada fila y exige al menos un ejercicio', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <TemplateForm
        catalog={[squat]}
        submitLabel="Crear plantilla"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    await user.type(screen.getByLabelText('Nombre'), 'Día A');
    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }));
    expect(await screen.findByText('Añade al menos un ejercicio.')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Añadir ejercicio'), 'Sentadilla');
    await user.clear(screen.getByLabelText('Series'));
    await user.type(screen.getByLabelText('Series'), '12');
    await user.click(screen.getByRole('button', { name: 'Crear plantilla' }));
    expect(await screen.findByText('Entre 1 y 10 series.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('AC-003-04: muestra los ejercicios desactivados que ya usa la plantilla, pero no los ofrece', () => {
    render(
      <TemplateForm
        catalog={[squat]}
        known={[legacy]}
        defaultValues={{
          name: 'Día A',
          items: [{ exerciseId: legacy.id, sets: 3, reps: '10', restSeconds: 60 }],
        }}
        submitLabel="Guardar cambios"
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Prensa antigua')).toBeInTheDocument();
    expect(screen.getByText('Desactivado')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Añadir ejercicio')).queryByRole('option', {
        name: 'Prensa antigua',
      }),
    ).not.toBeInTheDocument();
  });
});
