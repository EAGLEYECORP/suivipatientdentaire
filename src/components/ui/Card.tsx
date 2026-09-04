import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('carte', className)}>{children}</section>;
}

export function CardHeader({
  titre,
  sousTitre,
  action,
}: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{titre}</h2>
        {sousTitre ? <p className="mt-0.5 text-sm text-slate-500">{sousTitre}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-5 py-4', className)}>{children}</div>;
}
