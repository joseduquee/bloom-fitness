import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'success';
  children: ReactNode;
}) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2 rounded-lg p-3 text-sm',
        tone === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800',
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
