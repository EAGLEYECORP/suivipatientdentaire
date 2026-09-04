import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export type TonBadge = 'neutre' | 'info' | 'succes' | 'alerte' | 'danger' | 'violet';

const TONS: Record<TonBadge, string> = {
  neutre: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-brand-50 text-brand-700 border-brand-200',
  succes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  alerte: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

export function Badge({
  children,
  ton = 'neutre',
  className,
}: {
  children: ReactNode;
  ton?: TonBadge;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TONS[ton],
        className,
      )}
    >
      {children}
    </span>
  );
}
