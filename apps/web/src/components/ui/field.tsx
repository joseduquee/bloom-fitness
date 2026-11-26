import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Etiqueta, control y mensaje de error enlazados para lectores de pantalla (WCAG 2.1 AA). */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })
    : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {control}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
