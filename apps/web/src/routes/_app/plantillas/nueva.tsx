import { Role } from '@bloom/shared';
import { createFileRoute } from '@tanstack/react-router';
import { Page } from '../../../components/page';
import { requireRole } from '../../../features/auth/require-role';
import { BackToTemplates } from '../../../features/templates/back-to-templates';
import { TemplateEditor } from '../../../features/templates/template-editor';

export const Route = createFileRoute('/_app/plantillas/nueva')({
  beforeLoad: () => requireRole(Role.ADMIN, Role.TRAINER),
  component: NewTemplatePage,
});

function NewTemplatePage() {
  return (
    <Page title="Nueva plantilla" description={<BackToTemplates />}>
      <TemplateEditor />
    </Page>
  );
}
