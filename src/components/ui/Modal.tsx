import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

interface Props {
  ouvert: boolean;
  titre: string;
  sousTitre?: string;
  onFermer: () => void;
  children: ReactNode;
  pied?: ReactNode;
  largeur?: 'sm' | 'md' | 'lg' | 'xl';
}

const LARGEURS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Modal({ ouvert, titre, sousTitre, onFermer, children, pied, largeur = 'md' }: Props) {
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  // Rendered outside the app shell so a dialog can be printed on its own.
  return createPortal(
    <div className="modal-ouverte fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={cx('my-8 w-full rounded-xl bg-white shadow-xl', LARGEURS[largeur])}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{titre}</h2>
            {sousTitre ? <p className="mt-0.5 text-sm text-slate-500">{sousTitre}</p> : null}
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="no-print rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {pied ? (
          <footer className="no-print flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
            {pied}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
