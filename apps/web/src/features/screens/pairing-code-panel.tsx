import type { PairingCode } from '@bloom/shared';
import { utcToMadrid } from '../../lib/dates';

/** Código recién generado con las instrucciones para el televisor (AC-005-01). */
export function PairingCodePanel({ pairing }: { pairing: PairingCode }) {
  const tvUrl = `${window.location.origin}/tv`;
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p>
        En el televisor de <strong>{pairing.screen.name}</strong>, abre{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-900">{tvUrl}</code> e
        introduce este código:
      </p>
      <p
        aria-label={`Código ${pairing.code.split('').join(' ')}`}
        className="rounded-xl bg-slate-900 py-5 text-center font-mono text-5xl font-semibold tracking-[0.3em] text-white"
      >
        {pairing.code}
      </p>
      <p>
        Caduca a las <strong>{utcToMadrid(pairing.expiresAt).time}</strong> (10 minutos) y solo
        sirve una vez. No se volverá a mostrar: si lo pierdes, genera otro.
      </p>
    </div>
  );
}
