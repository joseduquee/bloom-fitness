import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionForm, type SessionFormValues } from './session-form';

const person = (id: string, firstName: string) => ({
  id,
  firstName,
  lastName: 'Demo',
  alias: null,
});
const clients = [
  person('11111111-1111-4111-8111-111111111111', 'Ana'),
  person('22222222-2222-4222-8222-222222222222', 'Bea'),
  person('33333333-3333-4333-8333-333333333333', 'Carlos'),
];
const [ana, bea, carlos] = clients as [
  (typeof clients)[0],
  (typeof clients)[0],
  (typeof clients)[0],
];
const defaults: SessionFormValues = {
  day: '2026-12-01',
  start: '09:00',
  end: '10:00',
  clientIds: [],
  notes: '',
};

const renderForm = (overrides: Partial<Parameters<typeof SessionForm>[0]> = {}) => {
  const onSubmit = vi.fn();
  render(
    <SessionForm
      defaultValues={defaults}
      clients={clients}
      maxAttendees={2}
      submitLabel="Programar sesión"
      submitting={false}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );
  return onSubmit;
};

describe('SessionForm', () => {
  it('AC-004-01: programa la sesión con la hora de Madrid convertida a UTC', async () => {
    const onSubmit = renderForm();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Añadir asistente'), 'Ana Demo');
    await user.selectOptions(screen.getByLabelText('Añadir asistente'), 'Carlos Demo');
    await user.click(screen.getByRole('button', { name: 'Programar sesión' }));

    expect(onSubmit).toHaveBeenCalledWith({
      startsAt: '2026-12-01T08:00:00.000Z',
      endsAt: '2026-12-01T09:00:00.000Z',
      trainerId: undefined,
      clientIds: [ana.id, carlos.id],
      notes: '',
    });
  });

  it('AC-004-01: no deja superar la capacidad y permite quitar asistentes', async () => {
    renderForm({ defaultValues: { ...defaults, clientIds: [ana.id, bea.id] } });
    expect(screen.getByText('Asistentes (2 de 2)')).toBeInTheDocument();
    expect(screen.getByLabelText('Añadir asistente')).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Ana Demo' }));
    expect(screen.getByLabelText('Añadir asistente')).toBeEnabled();
    expect(screen.getByText('Asistentes (1 de 2)')).toBeInTheDocument();
  });

  it('valida que haya asistentes y que la hora de fin sea posterior', async () => {
    const onSubmit = renderForm({ defaultValues: { ...defaults, end: '08:30' } });
    await userEvent.click(screen.getByRole('button', { name: 'Programar sesión' }));
    expect(await screen.findByText('Añade al menos un asistente.')).toBeInTheDocument();
    expect(
      screen.getByText('La hora de fin debe ser posterior a la de inicio.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('el administrador elige el entrenador', async () => {
    const trainers = [
      person('44444444-4444-4444-8444-444444444444', 'Marcos'),
      person('55555555-5555-4555-8555-555555555555', 'Irene'),
    ];
    const onSubmit = renderForm({
      trainers,
      defaultValues: { ...defaults, trainerId: trainers[0]?.id, clientIds: [ana.id] },
    });
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Entrenador'), 'Irene Demo');
    await user.click(screen.getByRole('button', { name: 'Programar sesión' }));
    expect(onSubmit.mock.calls[0]?.[0].trainerId).toBe(trainers[1]?.id);
  });
});
