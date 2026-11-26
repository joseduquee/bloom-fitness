import { createFileRoute } from '@tanstack/react-router';
import { ApiStatus } from '../../components/api-status';
import { Card } from '../../components/ui/card';
import { Page } from '../../components/page';
import { useSession } from '../../features/auth/session-store';

export const Route = createFileRoute('/_app/inicio')({
  component: HomePage,
});

function HomePage() {
  const user = useSession((state) => state.user);
  return (
    <Page
      title={`Hola, ${user?.alias ?? user?.firstName ?? ''}`}
      description="Resumen de tu centro."
    >
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          Las sesiones, rutinas y el histórico aparecerán aquí a medida que se incorporen.
        </p>
        <div className="mt-4">
          <ApiStatus />
        </div>
      </Card>
    </Page>
  );
}
