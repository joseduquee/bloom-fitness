import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RoutineForm } from './routine-form';

const templates = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Día A · Pierna', exerciseCount: 5 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Día B · Empuje', exerciseCount: 4 },
];
const [a, b] = templates as [(typeof templates)[0], (typeof templates)[0]];
const empty = {
  name: '',
  goal: '',
  startsOn: '2026-12-01',
  endsOn: '',
  templateIds: [],
  activate: true,
};

describe('RoutineForm', () => {
  it('AC-003-12: crea una rutina con fechas y plantillas ordenadas, activa por defecto', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <RoutineForm
        defaultValues={empty}
        templates={templates}
        showActivate
        submitLabel="Crear rutina"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText('Nombre'), 'Fuerza · bloque 1');
    await user.selectOptions(screen.getByLabelText('Añadir plantilla'), 'Día B · Empuje');
    await user.selectOptions(screen.getByLabelText('Añadir plantilla'), 'Día A · Pierna');
    await user.click(screen.getByRole('button', { name: 'Subir el día B' }));
    const days = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(days.map((day) => day.textContent)).toEqual([
      expect.stringContaining('ADía A · Pierna'),
      expect.stringContaining('BDía B · Empuje'),
    ]);
    expect(screen.getByLabelText(/Activar al guardar/)).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        name: 'Fuerza · bloque 1',
        goal: null,
        startsOn: '2026-12-01',
        endsOn: null,
        templateIds: [a.id, b.id],
        activate: true,
      },
      expect.anything(),
    );
  });

  it('valida que haya plantillas y que la fecha de fin no sea anterior a la de inicio', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <RoutineForm
        defaultValues={{ ...empty, name: 'Fuerza', endsOn: '2026-11-01' }}
        templates={templates}
        showActivate
        submitLabel="Crear rutina"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }));
    expect(await screen.findByText('Añade al menos una plantilla.')).toBeInTheDocument();
    expect(
      screen.getByText('La fecha de fin no puede ser anterior a la de inicio.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('al editar no muestra la casilla de activar', () => {
    render(
      <RoutineForm
        defaultValues={{ ...empty, name: 'Fuerza', templateIds: [a.id, a.id] }}
        templates={templates}
        showActivate={false}
        submitLabel="Guardar cambios"
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Activar al guardar/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Día A · Pierna', { selector: 'span' })).toHaveLength(2);
  });
});
