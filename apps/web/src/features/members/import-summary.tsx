import type { MemberImport } from '@bloom/shared';
import { Alert } from '../../components/ui/alert';
import { formatDuration } from './format';

const counters = [
  { key: 'created', label: 'Altas' },
  { key: 'updated', label: 'Actualizados' },
  { key: 'unchanged', label: 'Sin cambios' },
  { key: 'deactivated', label: 'Desactivados' },
  { key: 'errorCount', label: 'Errores' },
] as const;

/** Resumen de una importación (AC-002-02): contadores y, si los hay, la lista de errores. */
export function ImportSummary({ result }: { result: MemberImport }) {
  if (result.status === 'FAILED') {
    return (
      <Alert>
        La importación ha fallado: {result.failureReason ?? 'motivo desconocido'} No se ha
        modificado ningún dato.
      </Alert>
    );
  }

  const hiddenErrors = result.errorCount - result.errors.length;

  return (
    <div className="space-y-4">
      <Alert tone="success">Importación completada en {formatDuration(result.durationMs)}.</Alert>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counters.map(({ key, label }) => (
          <div
            key={key}
            className={
              key === 'errorCount' && result.errorCount > 0
                ? 'rounded-lg bg-red-50 p-3 text-red-900'
                : 'rounded-lg bg-slate-50 p-3 text-slate-900'
            }
          >
            <dt className="text-xs font-medium tracking-wide uppercase opacity-75">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{result[key]}</dd>
          </div>
        ))}
      </dl>
      {result.errors.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Socios no importados</h3>
          <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
            {result.errors.map((error, index) => (
              <li
                key={`${error.externalId ?? 'sin-id'}-${index}`}
                className="flex gap-3 px-3 py-2 text-sm"
              >
                <span className="w-28 shrink-0 font-mono text-slate-500">
                  {error.externalId ?? 'Sin id'}
                </span>
                <span className="text-slate-800">{error.message}</span>
              </li>
            ))}
          </ul>
          {hiddenErrors > 0 && (
            <p className="mt-2 text-sm text-slate-500">
              Y {hiddenErrors} errores más que no se muestran.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
