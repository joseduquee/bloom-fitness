import { importStatusLabels, membersProviderLabel, type MemberImport } from '@bloom/shared';
import { Badge } from '../../components/ui/badge';
import { formatDateTime, formatDuration } from './format';

/** Últimas ejecuciones de la importación, de la más reciente a la más antigua. */
export function ImportHistory({ items }: { items: MemberImport[] }) {
  if (items.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">Todavía no se ha importado nunca.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Últimas importaciones</caption>
        <thead className="border-b border-slate-200 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-3 py-3">
              Fecha
            </th>
            <th scope="col" className="px-3 py-3">
              Proveedor
            </th>
            <th scope="col" className="px-3 py-3">
              Resultado
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Altas
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Actualizados
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Sin cambios
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Desactivados
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Errores
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Duración
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 tabular-nums">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-3 py-3 whitespace-nowrap">
                {formatDateTime(item.startedAt)}
                {item.triggeredBy && (
                  <span className="block text-xs text-slate-500">{item.triggeredBy}</span>
                )}
              </td>
              <td className="px-3 py-3 whitespace-nowrap">{membersProviderLabel(item.source)}</td>
              <td className="px-3 py-3">
                <Badge tone={item.status === 'SUCCEEDED' ? 'success' : 'danger'}>
                  {importStatusLabels[item.status]}
                </Badge>
              </td>
              <td className="px-3 py-3 text-right">{item.created}</td>
              <td className="px-3 py-3 text-right">{item.updated}</td>
              <td className="px-3 py-3 text-right">{item.unchanged}</td>
              <td className="px-3 py-3 text-right">{item.deactivated}</td>
              <td className="px-3 py-3 text-right">{item.errorCount}</td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                {formatDuration(item.durationMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
