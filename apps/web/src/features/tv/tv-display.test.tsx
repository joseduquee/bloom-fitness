import type { ScreenSession } from '@bloom/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { gridFor, TvDisplay } from './tv-display';
import type { TvState } from './tv-state';

const base: TvState = {
  connection: 'live',
  center: { name: 'Bloom Centro', timezone: 'Europe/Madrid' },
  screenName: 'Tele',
  sessions: {},
};
const active: ScreenSession = {
  id: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
  status: 'IN_PROGRESS',
  revision: 1,
  attendees: [
    {
      slot: 1,
      displayName: 'Lu',
      absent: false,
      day: 'B',
      templateName: 'Empuje',
      progress: ['COMPLETED', 'PENDING'],
      current: {
        index: 1,
        name: 'Press de banca',
        mediaUrl: 'http://localhost:3000/media/exercises/a.gif',
        sets: 4,
        reps: '6-8',
        targetLoadKg: 50,
        restSeconds: 150,
        notes: null,
        setsDone: 1,
        lastSet: { weightKg: 50, reps: 8 },
      },
    },
  ],
};

describe('TvDisplay', () => {
  it('AC-005-05: sin sesión en curso muestra el centro y la hora', () => {
    render(<TvDisplay state={base} />);
    expect(screen.getByText('No hay ninguna sesión en curso')).toBeInTheDocument();
    expect(screen.getAllByText('Bloom Centro').length).toBeGreaterThan(0);
  });

  it('AC-005-06: con sesión muestra alias, ejercicio, GIF, serie, repeticiones y carga', () => {
    render(<TvDisplay state={{ ...base, sessions: { [active.id]: active } }} />);
    const tile = within(screen.getByRole('article'));
    expect(tile.getByRole('heading', { name: 'Lu' })).toBeInTheDocument();
    expect(tile.getByText('Press de banca')).toBeInTheDocument();
    expect(tile.getByRole('img', { name: 'Demostración: Press de banca' })).toBeInTheDocument();
    expect(tile.getByText('Serie 2 de 4')).toBeInTheDocument();
    expect(tile.getByText('6-8 reps')).toBeInTheDocument();
    expect(tile.getByText('50 kg')).toBeInTheDocument();
    expect(tile.getByText('Empuje')).toBeInTheDocument();
  });

  it('AC-005-08: el texto principal usa como mínimo 48 px (text-5xl)', () => {
    render(<TvDisplay state={{ ...base, sessions: { [active.id]: active } }} />);
    expect(screen.getByRole('heading', { name: 'Lu' })).toHaveClass('text-6xl');
    expect(screen.getByText('Serie 2 de 4').parentElement).toHaveClass('text-5xl');
  });

  it('AC-005-07: reparte de 1 a 4 tarjetas en una rejilla que cabe en la pantalla', () => {
    expect(gridFor(1)).toBe('grid-cols-1 grid-rows-1');
    expect(gridFor(2)).toBe('grid-cols-2 grid-rows-1');
    expect(gridFor(3)).toBe('grid-cols-3 grid-rows-1');
    expect(gridFor(4)).toBe('grid-cols-2 grid-rows-2');
  });

  it('AC-005-09: avisa de forma discreta al perder la conexión', () => {
    render(<TvDisplay state={{ ...base, connection: 'reconnecting' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
  });
});
