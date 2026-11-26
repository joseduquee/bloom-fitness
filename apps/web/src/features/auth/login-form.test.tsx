import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './login-form';
import { useSession } from './session-store';

const session = {
  accessToken: 'token',
  expiresIn: 900,
  user: {
    id: '0c4f7a0e-8f3a-4a52-9a7b-3f1f0f6d2b10',
    email: 'ana@bloom.test',
    firstName: 'Ana',
    lastName: 'García',
    alias: 'Ana',
    role: 'TRAINER',
    centerId: '6a1f4b2e-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
  },
};

describe('LoginForm', () => {
  beforeEach(() => {
    useSession.getState().clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('valida los campos con mensajes en español antes de llamar al API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<LoginForm onSuccess={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'no-es-correo');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Introduce un correo electrónico válido.')).toBeInTheDocument();
    expect(screen.getByText('Introduce la contraseña.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('AC-001-01: guarda la sesión y avisa al terminar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(session))));
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@bloom.test');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'contraseña-correcta');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(useSession.getState()).toMatchObject({ status: 'authenticated', accessToken: 'token' });
  });

  it('AC-001-02: muestra el mensaje del API cuando las credenciales no son válidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Correo o contraseña incorrectos.',
          }),
          { status: 401 },
        ),
      ),
    );
    render(<LoginForm onSuccess={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@bloom.test');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(useSession.getState().status).toBe('anonymous');
  });
});
