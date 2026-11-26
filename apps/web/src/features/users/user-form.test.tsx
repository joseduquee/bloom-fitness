import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserForm } from './user-form';

const defaults = {
  email: 'lucia.garcia.0001@socios.bloom.test',
  firstName: 'Lucía',
  lastName: 'García Pérez',
  alias: '',
  role: 'CLIENT' as const,
};

describe('UserForm', () => {
  it('AC-002-07: en un usuario importado, nombre, apellidos y correo son de solo lectura', async () => {
    const onSubmit = vi.fn();
    render(
      <UserForm
        defaultValues={defaults}
        submitLabel="Guardar cambios"
        submitting={false}
        lockedBy="Datos simulados"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/Usuario importado de/)).toHaveTextContent('Datos simulados');
    for (const label of ['Nombre', 'Apellidos', 'Correo electrónico']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('readonly');
    }
    expect(screen.getByLabelText('Alias')).not.toHaveAttribute('readonly');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nombre'), 'XX');
    await user.type(screen.getByLabelText('Alias'), 'Lu');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Lucía', alias: 'Lu' }),
      expect.anything(),
    );
  });

  it('en un usuario dado de alta a mano se puede editar todo', () => {
    render(
      <UserForm
        defaultValues={defaults}
        submitLabel="Guardar cambios"
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Usuario importado de/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).not.toHaveAttribute('readonly');
  });
});
