import type { Alerte, Severite } from '@/lib/decision';
import { cx } from '@/lib/utils';

const STYLE: Record<Severite, { bloc: string; pastille: string; libelle: string }> = {
  critique: {
    bloc: 'border-red-300 bg-red-50',
    pastille: 'bg-red-600 text-white',
    libelle: 'Critique',
  },
  elevee: {
    bloc: 'border-orange-300 bg-orange-50',
    pastille: 'bg-orange-500 text-white',
    libelle: 'Élevée',
  },
  moderee: {
    bloc: 'border-amber-200 bg-amber-50',
    pastille: 'bg-amber-400 text-amber-950',
    libelle: 'Modérée',
  },
  info: {
    bloc: 'border-slate-200 bg-slate-50',
    pastille: 'bg-slate-400 text-white',
    libelle: 'Information',
  },
};

/**
 * Alertes d'aide à la décision. Chaque carte indique la donnée du dossier qui
 * a déclenché la règle et la conduite proposée : le praticien peut vérifier le
 * raisonnement, et reste seul juge.
 */
export function PanneauAlertes({
  alertes,
  compact = false,
  onDents,
}: {
  alertes: Alerte[];
  compact?: boolean;
  onDents?: (dents: number[]) => void;
}) {
  if (alertes.length === 0) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Aucun point de vigilance détecté sur ce dossier.
      </p>
    );
  }

  return (
    <ul className={cx('space-y-2', compact && 'space-y-1.5')}>
      {alertes.map((a) => {
        const s = STYLE[a.severite];
        return (
          <li key={a.regle} className={cx('rounded-lg border px-3 py-2.5', s.bloc)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cx('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', s.pastille)}>
                {s.libelle}
              </span>
              <span className="font-semibold text-slate-900">{a.titre}</span>
              {a.dents.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onDents?.(a.dents)}
                  disabled={!onDents}
                  className={cx(
                    'rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600',
                    onDents && 'hover:border-brand-400 hover:text-brand-700',
                  )}
                >
                  {Array.from(new Set(a.dents)).join(', ')}
                </button>
              ) : null}
            </div>
            {compact ? null : (
              <>
                <p className="mt-1 text-sm text-slate-700">{a.declencheur}</p>
                <p className="mt-1 text-sm font-medium text-slate-800">→ {a.conduite}</p>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
