import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PairingCodePanel } from './pairing-code-panel';

describe('PairingCodePanel', () => {
  it('AC-005-01: muestra el código, la hora de caducidad y dónde introducirlo', () => {
    render(
      <PairingCodePanel
        pairing={{
          screen: {
            id: '0f7e5c1a-5b6d-4c3e-9f2a-1b2c3d4e5f60',
            name: 'Tele de la sala',
            status: 'PENDING',
            pairedAt: null,
            lastSeenAt: null,
            createdAt: '2026-12-01T09:00:00.000Z',
          },
          code: 'ABC234',
          expiresAt: '2026-12-01T09:10:00.000Z',
        }}
      />,
    );
    expect(screen.getByLabelText('Código A B C 2 3 4')).toHaveTextContent('ABC234');
    expect(screen.getByText('10:10')).toBeInTheDocument();
    expect(screen.getByText(/\/tv$/)).toBeInTheDocument();
  });
});
