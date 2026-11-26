import { Dumbbell } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Miniatura del GIF del ejercicio o un icono si todavía no tiene. */
export function ExerciseThumbnail({
  url,
  name,
  className,
}: {
  url: string | null;
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100',
        className,
      )}
    >
      {url ? (
        <img src={url} alt={`Demostración: ${name}`} className="size-full object-cover" />
      ) : (
        <Dumbbell className="size-1/2 text-slate-400" aria-hidden="true" />
      )}
    </div>
  );
}
