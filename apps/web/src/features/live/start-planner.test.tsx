import type { StartPlan } from '@bloom/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StartPlanner } from './start-planner';

const ids = {
  ana: '11111111-1111-4111-8111-111111111111',
  bea: '22222222-2222-4222-8222-222222222222',
  a: '33333333-3333-4333-8333-333333333333',
  b: '44444444-4444-4444-8444-444444444444',
  c: '55555555-5555-4555-8555-555555555555',
};
const plan: StartPlan = {
  attendees: [
    {
      client: { id: ids.ana, firstName: 'Ana', lastName: 'Demo', alias: null },
      routine: {
        id: '66666666-6666-4666-8666-666666666666',
        name: 'Fuerza',
        templates: [
          { position: 0, id: ids.a, name: 'Pierna' },
          { position: 1, id: ids.b, name: 'Empuje' },
        ],
      },
      proposedTemplateId: ids.b,
      proposedPosition: 1,
    },
    {
      client: { id: ids.bea, firstName: 'Bea', lastName: 'Demo', alias: null },
      routine: null,
      proposedTemplateId: null,
      proposedPosition: null,
    },
  ],
};
const templates = [
  { id: ids.a, name: 'Pierna' },
  { id: ids.b, name: 'Empuje' },
  { id: ids.c, name: 'Movilidad' },
];

describe('StartPlanner', () => {
  it('AC-004-04: muestra la plantilla que toca y permite cambiarla antes de iniciar', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<StartPlanner plan={plan} templates={templates} starting={false} onStart={onStart} />);

    expect(screen.getByText('Fuerza: toca el día B (Empuje)')).toBeInTheDocument();
    expect(screen.getByLabelText('Plantilla de Ana Demo')).toHaveValue(ids.b);
    expect(screen.getByLabelText('Plantilla de Bea Demo')).toHaveValue('');

    await user.selectOptions(screen.getByLabelText('Plantilla de Bea Demo'), 'Movilidad');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(onStart).toHaveBeenCalledWith({
      assignments: [
        { clientId: ids.ana, templateId: ids.b },
        { clientId: ids.bea, templateId: ids.c },
      ],
    });
  });
});
