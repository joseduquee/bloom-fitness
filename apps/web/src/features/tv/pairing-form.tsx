import {
  pairScreenRequestSchema,
  pairScreenResponseSchema,
  PAIRING_CODE_LENGTH,
} from '@bloom/shared';
import { useMutation } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
import { apiFetch, errorMessage } from '../../lib/api';

/** AC-005-02: el televisor introduce el código y recibe su token de dispositivo. */
export function PairingForm({ onPaired }: { onPaired: (token: string) => void }) {
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const pair = useMutation({
    mutationFn: (value: string) =>
      apiFetch('/screens/pair', pairScreenResponseSchema, {
        method: 'POST',
        body: { code: value },
        retryOnUnauthorized: false,
      }),
    onSuccess: (response) => onPaired(response.token),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = pairScreenRequestSchema.safeParse({ code });
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'El código no es válido.');
      return;
    }
    setInvalid(null);
    pair.mutate(parsed.data.code);
  };

  const error = invalid ?? (pair.isError ? errorMessage(pair.error) : null);

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-10 bg-slate-950 px-10 text-center text-white">
      <MonitorSmartphone className="size-24 text-emerald-300" aria-hidden="true" />
      <div className="space-y-4">
        <h1 className="text-6xl font-bold">Emparejar esta pantalla</h1>
        <p className="text-3xl text-slate-300">
          Pide el código en Bloom Fitness → Pantallas e introdúcelo aquí.
        </p>
      </div>
      <form onSubmit={submit} className="flex w-full max-w-3xl flex-col items-center gap-6">
        <label htmlFor="pairing-code" className="sr-only">
          Código de emparejamiento
        </label>
        <input
          id="pairing-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={PAIRING_CODE_LENGTH + 2}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'pairing-error' : undefined}
          placeholder="ABC234"
          className="w-full rounded-2xl bg-slate-900 px-8 py-6 text-center font-mono text-8xl tracking-[0.3em] text-white uppercase ring-2 ring-slate-600 placeholder:text-slate-700 focus:ring-4 focus:ring-emerald-400 focus:outline-none"
        />
        {error && (
          <p id="pairing-error" role="alert" className="text-3xl text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pair.isPending}
          className="rounded-2xl bg-emerald-400 px-12 py-5 text-4xl font-semibold text-slate-950 hover:bg-emerald-300 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-60"
        >
          {pair.isPending ? 'Emparejando…' : 'Emparejar'}
        </button>
      </form>
    </main>
  );
}
