import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';

/** Muestra el enlace de activación para copiarlo y enviárselo al usuario (AC-001-16). */
export function ActivationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Envía este enlace al usuario para que elija su contraseña. Caduca en 72 horas y solo se
        puede usar una vez.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label="Enlace de activación"
          onFocus={(event) => event.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-lg bg-slate-50 px-3 font-mono text-xs text-slate-700 ring-1 ring-slate-200"
        />
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}
