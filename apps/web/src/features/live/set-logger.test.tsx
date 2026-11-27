import type { LiveExercise } from '@bloom/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setDefaults, SetLogger } from './set-logger';

const exercise = (overrides: Partial<LiveExercise> = {}): LiveExercise => ({
  position: 0,
  exercise: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Sentadilla',
    primaryMuscle: 'QUADRICEPS',
    equipment: 'BARBELL',
    mediaUrl: null,
    isActive: true,
  },
  originalExerciseId: null,
  sets: 3,
  reps: '8-10',
  targetLoadKg: 60,
  restSeconds: 90,
  notes: null,
  status: 'PENDING',
  logs: [],
  ...overrides,
});

describe('SetLogger', () => {
  it('AC-004-10: precarga el objetivo y, a partir de la segunda serie, lo de la anterior', () => {
    expect(setDefaults(exercise(), 1)).toEqual({ weightKg: 60, reps: 8, rpe: null });
    const withLog = exercise({ logs: [{ setNumber: 1, weightKg: 62.5, reps: 9, rpe: 8 }] });
    expect(setDefaults(withLog, 2)).toEqual({ weightKg: 62.5, reps: 9, rpe: null });
    // Al corregir una serie se cargan sus propios valores.
    expect(setDefaults(withLog, 1)).toEqual({ weightKg: 62.5, reps: 9, rpe: 8 });
  });

  it('AC-004-11: guarda peso, repeticiones y RPE opcional', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <SetLogger exercise={exercise()} setNumber={1} saving={false} error={null} onSave={onSave} />,
    );
    expect(screen.getByText('Registrar serie 1 de 3')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Repeticiones'));
    await user.type(screen.getByLabelText('Repeticiones'), '10');
    await user.type(screen.getByLabelText('RPE'), '7');
    await user.click(screen.getByRole('button', { name: 'Guardar serie' }));
    expect(onSave).toHaveBeenCalledWith({ weightKg: 60, reps: 10, rpe: 7 }, expect.anything());
  });

  it('AC-004-11: rechaza pesos fuera de rango o que no son múltiplos de 0,25', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <SetLogger exercise={exercise()} setNumber={1} saving={false} error={null} onSave={onSave} />,
    );
    await user.clear(screen.getByLabelText('Peso (kg)'));
    await user.type(screen.getByLabelText('Peso (kg)'), '60.1');
    await user.click(screen.getByRole('button', { name: 'Guardar serie' }));
    expect(await screen.findByText('Usa múltiplos de 0,25 kg.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('AC-004-13: si falla la red conserva lo escrito y permite reintentar', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SetLogger exercise={exercise()} setNumber={1} saving={false} error={null} onSave={onSave} />,
    );
    await user.clear(screen.getByLabelText('Peso (kg)'));
    await user.type(screen.getByLabelText('Peso (kg)'), '70');
    await user.click(screen.getByRole('button', { name: 'Guardar serie' }));

    rerender(
      <SetLogger
        exercise={exercise()}
        setNumber={1}
        saving={false}
        error="No se puede conectar con el servidor. Comprueba tu conexión."
        onSave={onSave}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('No se puede conectar con el servidor');
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue(70);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onSave).toHaveBeenLastCalledWith({ weightKg: 70, reps: 8, rpe: null });
  });

  it('AC-004-12: indica cuando se corrige una serie ya registrada', () => {
    render(
      <SetLogger
        exercise={exercise({ logs: [{ setNumber: 1, weightKg: 60, reps: 8, rpe: null }] })}
        setNumber={1}
        saving={false}
        error={null}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText('Corregir serie 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar corrección' })).toBeInTheDocument();
  });
});
