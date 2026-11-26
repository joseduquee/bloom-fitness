import { healthResponseSchema } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

/** Indicador del estado del API y de la base de datos. */
export function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch('/health', healthResponseSchema),
    refetchInterval: 30_000,
  });

  if (isPending) {
    return <StatusBadge tone="neutral" label="Comprobando el servidor…" />;
  }
  if (isError || data.status !== 'ok') {
    return <StatusBadge tone="error" label="Servidor no disponible" />;
  }
  return <StatusBadge tone="ok" label={`Servidor operativo · v${data.version}`} />;
}

type Tone = 'ok' | 'error' | 'neutral';

const toneClasses: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  error: 'bg-red-50 text-red-800 ring-red-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

function StatusBadge({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ${toneClasses[tone]}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
