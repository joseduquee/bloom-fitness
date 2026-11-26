import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

export function BackToTemplates() {
  return (
    <Link
      to="/plantillas"
      className="inline-flex items-center gap-1 text-brand-700 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a las plantillas
    </Link>
  );
}
