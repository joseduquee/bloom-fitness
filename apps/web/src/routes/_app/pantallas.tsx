import { Role, screenStatusLabels, type PairingCode, type Screen } from '@bloom/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog } from '../../components/ui/dialog';
import { Field } from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import { Spinner } from '../../components/ui/spinner';
import { Page } from '../../components/page';
import { requireRole } from '../../features/auth/require-role';
import {
  screensKeys,
  screensQuery,
  useCreateScreen,
  useNewPairingCode,
  useRevokeScreen,
} from '../../features/screens/api';
import { PairingCodePanel } from '../../features/screens/pairing-code-panel';
import { errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/dates';

export const Route = createFileRoute('/_app/pantallas')({
  beforeLoad: () => requireRole(Role.ADMIN),
  component: ScreensPage,
});

const statusTone = { PENDING: 'warning', PAIRED: 'success', REVOKED: 'neutral' } as const;

/** Pantallas de la sala (spec 005, HU-005-1). */
function ScreensPage() {
  const { data, isPending, isError, error } = useQuery(screensQuery());
  const queryClient = useQueryClient();
  const newCode = useNewPairingCode();
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState<PairingCode | null>(null);
  const [revoking, setRevoking] = useState<Screen | null>(null);
  // Al cerrar el código, lo normal es que la tele ya se haya emparejado: se refresca la lista.
  const closeCode = () => {
    setCode(null);
    void queryClient.invalidateQueries({ queryKey: screensKeys.all });
  };

  return (
    <Page
      title="Pantallas"
      description="Televisores de la sala que muestran el entrenamiento en directo."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nueva pantalla
        </Button>
      }
    >
      <Card>
        {newCode.isError && (
          <div className="p-4 pb-0">
            <Alert>{errorMessage(newCode.error)}</Alert>
          </div>
        )}
        {isPending ? (
          <div className="flex justify-center p-10">
            <Spinner label="Cargando pantallas" />
          </div>
        ) : isError ? (
          <div className="p-4">
            <Alert>{errorMessage(error)}</Alert>
          </div>
        ) : data.items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">
            Todavía no hay pantallas. Da de alta la primera para emparejar un televisor.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((screen) => (
              <li key={screen.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-48 flex-1">
                  <p className="font-medium text-slate-900">{screen.name}</p>
                  <p className="text-sm text-slate-500">
                    {screen.lastSeenAt
                      ? `Última conexión: ${formatDateTime(screen.lastSeenAt)}`
                      : 'Nunca se ha conectado'}
                  </p>
                </div>
                <Badge tone={statusTone[screen.status]}>{screenStatusLabels[screen.status]}</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={newCode.isPending && newCode.variables === screen.id}
                  onClick={() => newCode.mutate(screen.id, { onSuccess: setCode })}
                >
                  {screen.status === 'PENDING' ? 'Nuevo código' : 'Volver a emparejar'}
                </Button>
                {screen.status === 'PAIRED' && (
                  <Button variant="ghost" size="sm" onClick={() => setRevoking(screen)}>
                    Revocar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {creating && (
        <CreateScreenDialog
          onClose={() => setCreating(false)}
          onCreated={(pairing) => {
            setCreating(false);
            setCode(pairing);
          }}
        />
      )}
      {code && (
        <Dialog open onClose={closeCode} title="Código de emparejamiento">
          <PairingCodePanel pairing={code} />
          <div className="mt-4 flex justify-end">
            <Button onClick={closeCode}>Hecho</Button>
          </div>
        </Dialog>
      )}
      {revoking && <RevokeDialog screen={revoking} onClose={() => setRevoking(null)} />}
    </Page>
  );
}

function CreateScreenDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (pairing: PairingCode) => void;
}) {
  const create = useCreateScreen();
  const [name, setName] = useState('');
  const tooShort = name.trim().length < 2;
  return (
    <Dialog open onClose={onClose} title="Nueva pantalla">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!tooShort) create.mutate({ name }, { onSuccess: onCreated });
        }}
      >
        {create.isError && <Alert>{errorMessage(create.error)}</Alert>}
        <Field label="Nombre" hint="Para reconocerla, por ejemplo «Tele junto a los racks».">
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={tooShort} loading={create.isPending}>
            Crear y obtener código
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RevokeDialog({ screen, onClose }: { screen: Screen; onClose: () => void }) {
  const revoke = useRevokeScreen();
  return (
    <Dialog open onClose={onClose} title="¿Revocar la pantalla?">
      <div className="space-y-4 text-sm text-slate-700">
        {revoke.isError && <Alert>{errorMessage(revoke.error)}</Alert>}
        <p>
          <strong>{screen.name}</strong> dejará de mostrar el entrenamiento al momento y volverá a
          pedir un código. Úsalo si se ha perdido el televisor o se ha emparejado por error.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={revoke.isPending}
            onClick={() => revoke.mutate(screen.id, { onSuccess: onClose })}
          >
            Revocar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
