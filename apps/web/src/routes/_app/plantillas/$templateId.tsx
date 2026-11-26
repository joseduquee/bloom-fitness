import { Role } from '@bloom/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Alert } from '../../../components/ui/alert';
import { Spinner } from '../../../components/ui/spinner';
import { Page } from '../../../components/page';
import { requireRole } from '../../../features/auth/require-role';
import { templateQuery } from '../../../features/templates/api';
import { BackToTemplates } from '../../../features/templates/back-to-templates';
import { TemplateEditor } from '../../../features/templates/template-editor';
import { errorMessage } from '../../../lib/api';

export const Route = createFileRoute('/_app/plantillas/$templateId')({
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: TemplatePage,
});

function TemplatePage() {
  const { templateId } = Route.useParams();
  const { data, isPending, isError, error } = useQuery(templateQuery(templateId));

  return (
    <Page title={data?.name ?? 'Plantilla'} description={<BackToTemplates />}>
      {isPending ? (
        <div className="flex justify-center p-10">
          <Spinner label="Cargando la plantilla" />
        </div>
      ) : isError ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : (
        <TemplateEditor template={data} />
      )}
    </Page>
  );
}
