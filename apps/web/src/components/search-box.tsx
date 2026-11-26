import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from './ui/input';

/** Búsqueda con espera de 300 ms para no lanzar una petición por cada tecla. */
export function SearchBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  // El texto se inicializa desde la URL y a partir de ahí lo gobierna el propio campo.
  const [text, setText] = useState(value);
  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="relative min-w-56 flex-1">
      <Search
        className="pointer-events-none absolute top-3 left-3 size-4 text-slate-400"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        className="pl-9"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </div>
  );
}
