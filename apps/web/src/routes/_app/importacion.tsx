import { Role } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { Spinner } from '../../components/ui/spinner';
import { Page } from '../../components/page';
import { requireRole } from '../../features/auth/require-role';
import { memberImportsQuery, useRunImport } from '../../features/members/api';
import { formatDateTime } from '../../lib/dates';
import { ImportHistory } from '../../features/members/import-history';
import { ImportSummary } from '../../features/members/import-summary';
import { errorMessage } from '../../lib/api';

export const Route = createFileRoute('/_app/importacion')({
  beforeLoad: () => requireRole(Role.ADMIN),
  component: ImportPage,
});

/** Importación de socios desde el proveedor configurado (spec 002). */
function ImportPage() {
  const history = useQuery(memberImportsQuery());
  const runImport = useRunImport();
  const [confirming, setConfirming] = useState(false);

  const provider = history.data?.provider;
  const latest = runImport.data ?? history.data?.items[0];

  const start = () => {
    setConfirming(false);
    runImport.mutate();
  };

  return (
    <Page
      title="Importación de socios"
      description="Trae los socios del programa de gestión del centro para no darlos de alta dos veces."
    >
      <div className="space-y-6">
        <Card className="p-6">
          {history.isPending ? (
            <div className="flex justify-center p-6">
              <Spinner label="Cargando la configuración" />
            </div>
          ) : history.isError ? (
            <Alert>{errorMessage(history.error)}</Alert>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm">
                  <p className="text-slate-500">Proveedor configurado</p>
                  <p className="text-base font-semibold text-slate-900">{provider?.label}</p>
                </div>
                <Button loading={runImport.isPending} onClick={() => setConfirming(true)}>
                  <Download className="size-4" aria-hidden="true" />
                  {runImport.isPending ? 'Importando…' : 'Importar socios'}
                </Button>
              </div>

              {runImport.isError && <Alert>{errorMessage(runImport.error)}</Alert>}

              {latest && !runImport.isPending && (
                <section aria-labelledby="latest-import" className="space-y-3">
                  <h2 id="latest-import" className="text-base font-semibold text-slate-900">
                    {runImport.data ? 'Resultado' : 'Última importación'}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {formatDateTime(latest.startedAt)}
                    </span>
                  </h2>
                  <ImportSummary result={latest} />
                </section>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900">
            Histórico
          </h2>
          {history.isPending ? (
            <div className="flex justify-center p-8">
              <Spinner label="Cargando el histórico" />
            </div>
          ) : history.isError ? (
            <div className="p-4">
              <Alert>{errorMessage(history.error)}</Alert>
            </div>
          ) : (
            <ImportHistory items={history.data.items} />
          )}
        </Card>
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="¿Importar socios?">
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            Se consultará <strong>{provider?.label}</strong> y se aplicarán los cambios:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Los socios nuevos se darán de alta como clientes pendientes de activar.</li>
            <li>Los que ya existen se actualizarán con los datos del proveedor.</li>
            <li>
              Quien ya no aparezca en el proveedor se <strong>desactivará</strong>. No se borra
              nada.
            </li>
          </ul>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button onClick={start}>Importar</Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
