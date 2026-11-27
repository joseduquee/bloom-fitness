import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { PairingForm } from '../features/tv/pairing-form';
import { clearScreenToken, readScreenToken, saveScreenToken } from '../features/tv/screen-token';
import { TvDisplay } from '../features/tv/tv-display';
import { useScreenSocket } from '../features/tv/use-screen-socket';

/** Pantalla de sala (spec 005). No usa sesión de usuario: se identifica con su token de dispositivo. */
export const Route = createFileRoute('/tv')({
  component: TvPage,
});

function TvPage() {
  const [token, setToken] = useState(readScreenToken);
  const forget = useCallback(() => {
    clearScreenToken();
    setToken(null);
  }, []);

  if (!token) {
    return (
      <PairingForm
        onPaired={(value) => {
          saveScreenToken(value);
          setToken(value);
        }}
      />
    );
  }
  return <ConnectedScreen token={token} onUnauthorized={forget} />;
}

function ConnectedScreen({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const state = useScreenSocket(token, onUnauthorized);
  return <TvDisplay state={state} />;
}
