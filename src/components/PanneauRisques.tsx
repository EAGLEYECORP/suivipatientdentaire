import type { EvaluationRisque, NiveauRisque, RisqueParodontal } from '@/lib/decision';
import { Badge } from '@/components/ui/Badge';
import { cx } from '@/lib/utils';

const TON: Record<NiveauRisque, 'succes' | 'alerte' | 'danger'> = {
  faible: 'succes',
  modere: 'alerte',
  eleve: 'danger',
  extreme: 'danger',
};

const LIBELLE: Record<NiveauRisque, string> = {
  faible: 'Faible',
  modere: 'Modéré',
  eleve: 'Élevé',
  extreme: 'Extrême',
};

function Jauge({ niveau }: { niveau: NiveauRisque }) {
  const paliers: NiveauRisque[] = ['faible', 'modere', 'eleve', 'extreme'];
  const index = paliers.indexOf(niveau);
  const couleurs = ['bg-emerald-500', 'bg-amber-400', 'bg-orange-500', 'bg-red-600'];
  return (
    <div className="flex gap-1" aria-hidden="true">
      {paliers.map((p, i) => (
        <span key={p} className={cx('h-1.5 w-8 rounded-full', i <= index ? couleurs[index] : 'bg-slate-200')} />
      ))}
    </div>
  );
}

export function PanneauRisques({
  carieux,
  parodontal,
  rappel,
}: {
  carieux: EvaluationRisque;
  parodontal: RisqueParodontal;
  rappel: { mois: number; motif: string };
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Rappel conseillé</p>
        <p className="mt-0.5 text-2xl font-bold text-brand-900">
          {rappel.mois} <span className="text-sm font-semibold">mois</span>
        </p>
        <p className="text-xs text-brand-800">Déterminé par le {rappel.motif}.</p>
      </div>

      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h4 className="font-semibold text-slate-800">Risque carieux</h4>
          <Badge ton={TON[carieux.niveau]}>{LIBELLE[carieux.niveau]}</Badge>
        </div>
        <Jauge niveau={carieux.niveau} />
        {carieux.indicateurs.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Maladie active</p>
            <ul className="list-inside list-disc text-slate-700">
              {carieux.indicateurs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {carieux.facteurs.length > 0 ? (
          <div className="mt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Facteurs de risque</p>
            <ul className="list-inside list-disc text-slate-700">
              {carieux.facteurs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {carieux.recommandations.length > 0 ? (
          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prévention</p>
            <ul className="list-inside list-disc text-slate-700">
              {carieux.recommandations.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="border-t border-slate-200 pt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h4 className="font-semibold text-slate-800">Risque parodontal</h4>
          <Badge ton={TON[parodontal.niveau]}>{LIBELLE[parodontal.niveau]}</Badge>
        </div>
        <Jauge niveau={parodontal.niveau} />
        <p className="mt-1 text-xs text-slate-500">{parodontal.commentaire}</p>
        <ul className="mt-2 space-y-1">
          {parodontal.vecteurs.map((v) => (
            <li key={v.nom} className="flex items-center justify-between gap-2">
              <span className="text-slate-600">{v.nom}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-slate-800">{v.valeur}</span>
                <span
                  className={cx(
                    'h-2 w-2 rounded-full',
                    v.niveau === 'faible'
                      ? 'bg-emerald-500'
                      : v.niveau === 'modere'
                        ? 'bg-amber-400'
                        : 'bg-red-600',
                  )}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
