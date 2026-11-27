import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

const tones = {
  error: { icon: CircleAlert, role: 'alert', className: 'bg-red-50 text-red-800' },
  success: { icon: CircleCheck, role: 'status', className: 'bg-emerald-50 text-emerald-800' },
  info: { icon: Info, role: 'status', className: 'bg-sky-50 text-sky-900' },
} as const;

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  const { icon: Icon, role, className } = tones[tone];
  return (
    <div role={role} className={cn('flex gap-2 rounded-lg p-3 text-sm', className)}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
