import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils';

type Variante = 'primaire' | 'secondaire' | 'fantome' | 'danger' | 'succes';
type Taille = 'sm' | 'md' | 'lg';

const VARIANTES: Record<Variante, string> = {
  primaire: 'bg-brand-600 text-white hover:bg-brand-700 border-brand-600',
  secondaire: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300',
  fantome: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
  succes: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600',
};

const TAILLES: Record<Taille, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  taille?: Taille;
  children: ReactNode;
}

export function Button({ variante = 'primaire', taille = 'md', className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTES[variante],
        TAILLES[taille],
        className,
      )}
    >
      {children}
    </button>
  );
}
