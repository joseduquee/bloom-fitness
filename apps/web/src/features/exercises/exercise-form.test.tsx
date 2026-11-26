import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ExerciseForm, mediaError } from './exercise-form';

beforeAll(() => {
  // jsdom no implementa las URL de objetos.
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
  URL.revokeObjectURL = vi.fn();
});

const gif = (bytes = 10) => new File([new Uint8Array(bytes)], 'demo.gif', { type: 'image/gif' });

describe('ExerciseForm', () => {
  it('AC-003-01: envía los datos del ejercicio y el GIF elegido', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<ExerciseForm submitLabel="Crear ejercicio" submitting={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Nombre'), 'Remo con barra');
    await user.selectOptions(screen.getByLabelText('Músculo principal'), 'Espalda');
    await user.selectOptions(screen.getByLabelText('Dificultad'), 'Intermedio');
    const file = gif();
    await user.upload(screen.getByLabelText('Elegir GIF'), file);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:vista-previa');
    await user.click(screen.getByRole('button', { name: 'Crear ejercicio' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Remo con barra',
        primaryMuscle: 'BACK',
        equipment: 'BARBELL',
        difficulty: 'INTERMEDIATE',
      }),
      file,
    );
  });

  it('muestra los errores de validación del esquema compartido', async () => {
    const onSubmit = vi.fn();
    render(<ExerciseForm submitLabel="Crear ejercicio" submitting={false} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }));
    expect(
      await screen.findByText('El nombre debe tener al menos 2 caracteres.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('AC-003-02: rechaza en el navegador archivos que no son GIF o que superan 5 MB', () => {
    expect(mediaError(gif())).toBeNull();
    expect(mediaError(new File(['x'], 'foto.png', { type: 'image/png' }))).toBe(
      'El archivo debe ser un GIF.',
    );
    expect(mediaError(gif(5 * 1024 * 1024 + 1))).toBe('El GIF no puede superar 5 MB.');
  });

  it('permite quitar el GIF que ya tiene el ejercicio', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <ExerciseForm
        defaultValues={{ name: 'Plancha frontal', primaryMuscle: 'CORE' }}
        currentMediaUrl="http://localhost:3000/media/exercises/a.gif"
        submitLabel="Guardar cambios"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Plancha frontal' }),
      null,
    );
  });
});
