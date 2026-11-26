import type { Exercise } from '@bloom/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExercisesTable } from './exercises-table';

const exercise = (overrides: Partial<Exercise>): Exercise => ({
  id: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
  name: 'Sentadilla con barra',
  primaryMuscle: 'QUADRICEPS',
  equipment: 'BARBELL',
  difficulty: 'INTERMEDIATE',
  instructions: null,
  mediaUrl: 'http://localhost:3000/media/exercises/a.gif',
  isActive: true,
  createdAt: '2026-11-26T10:00:00.000Z',
  updatedAt: '2026-11-26T10:00:00.000Z',
  ...overrides,
});

describe('ExercisesTable', () => {
  it('muestra el GIF, el músculo, el equipamiento y la dificultad en español', () => {
    render(<ExercisesTable exercises={[exercise({})]} onEdit={vi.fn()} />);
    const row = screen.getAllByRole('row')[1] as HTMLElement;
    expect(
      within(row).getByRole('img', { name: 'Demostración: Sentadilla con barra' }),
    ).toHaveAttribute('src', 'http://localhost:3000/media/exercises/a.gif');
    expect(row).toHaveTextContent('Cuádriceps');
    expect(row).toHaveTextContent('Barra');
    expect(row).toHaveTextContent('Intermedio');
  });

  it('AC-003-04: marca los desactivados', () => {
    render(
      <ExercisesTable
        exercises={[exercise({ isActive: false, mediaUrl: null })]}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('Desactivado')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('abre la edición del ejercicio elegido', async () => {
    const onEdit = vi.fn();
    const item = exercise({});
    render(<ExercisesTable exercises={[item]} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Sentadilla con barra' }));
    expect(onEdit).toHaveBeenCalledWith(item);
  });

  it('avisa cuando no hay resultados', () => {
    render(<ExercisesTable exercises={[]} onEdit={vi.fn()} />);
    expect(
      screen.getByText('No hay ejercicios que coincidan con la búsqueda.'),
    ).toBeInTheDocument();
  });
});
