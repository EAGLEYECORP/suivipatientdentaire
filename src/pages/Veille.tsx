import { useEffect, useMemo, useState } from 'react';
import {
  DATE_VEILLE,
  EXPLICATION_MATURITE,
  LIBELLE_CATEGORIE,
  LIBELLE_MATURITE,
  MOIS_AVANT_PEREMPTION,
  ageDuFilEnMois,
  entreesNouvelles,
  filPerime,
  formaterMois,
  veilleTriee,
  type CategorieVeille,
  type EntreeVeille,
  type MaturiteVeille,
} from '@/data/veille';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, type TonBadge } from '@/components/ui/Badge';
import { cx } from '@/lib/utils';

/*
 * La date de dernière consultation vit dans localStorage, pas dans le
 * magasin chiffré : savoir quand le praticien a lu sa veille n'est pas une
 * donnée clinique, cela n'a pas à entrer dans le journal du dossier ni à
 * être chiffré avec les patients.
 */
const CLE_VUE = 'suivi-patient-dentaire:veille-vue-le';

function lireDerniereVisite(): string | null {
  try {
    return window.localStorage.getItem(CLE_VUE);
  } catch {
    return null;
  }
}

function marquerCommeLue(): void {
  try {
    window.localStorage.setItem(CLE_VUE, DATE_VEILLE);
  } catch {
    // Navigation privée : on perd le repère « nouveau », rien de plus.
  }
}

const TON_MATURITE: Record<MaturiteVeille, TonBadge> = {
  disponible: 'succes',
  essai: 'alerte',
  recherche: 'violet',
  cadre: 'info',
};

const CATEGORIES: CategorieVeille[] = ['ia', 'regeneration', 'reglementation', 'materiaux'];

function Entree({ entree, neuve }: { entree: EntreeVeille; neuve: boolean }) {
  return (
    <article className="carte p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton={TON_MATURITE[entree.maturite]}>{LIBELLE_MATURITE[entree.maturite]}</Badge>
        <Badge>{LIBELLE_CATEGORIE[entree.categorie]}</Badge>
        {neuve ? <Badge ton="danger">Nouveau</Badge> : null}
        <span className="ml-auto text-xs text-slate-500">{formaterMois(entree.date)}</span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug text-slate-900">{entree.titre}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{entree.resume}</p>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ce que cela change
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{entree.consequence}</p>

      {/*
       * La réserve est encadrée plutôt que glissée en note de bas de page :
       * c'est la partie qu'un praticien pressé doit voir, pas celle qu'il
       * doit chercher.
       */}
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Réserve</p>
        <p className="mt-1 text-sm leading-relaxed text-amber-900">{entree.reserve}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">Source :</span>
        {entree.sources.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700"
          >
            {s.titre}
          </a>
        ))}
      </div>
    </article>
  );
}

export function Veille() {
  const [filtre, setFiltre] = useState<CategorieVeille | 'tout'>('tout');
  /* Lu une seule fois au montage : sinon le marquage effacerait l'état. */
  const [derniereVisite] = useState(lireDerniereVisite);

  useEffect(() => {
    marquerCommeLue();
  }, []);

  const entrees = useMemo(veilleTriee, []);
  const neuves = useMemo(() => entreesNouvelles(derniereVisite), [derniereVisite]);
  const visibles = filtre === 'tout' ? entrees : entrees.filter((e) => e.categorie === filtre);

  const age = ageDuFilEnMois();
  const perime = filPerime();

  const presentes = CATEGORIES.filter((c) => entrees.some((e) => e.categorie === c));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          titre="Veille professionnelle"
          sousTitre={`${entrees.length} entrées · fil arrêté en ${formaterMois(DATE_VEILLE)}`}
        />
        <CardBody className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-600">
            Ce fil est livré avec le logiciel et ne se rafraîchit pas tout seul : l’application ne
            passe aucun appel réseau, et un fil d’actualité qui interrogerait un serveur
            contredirait cette promesse. Il est mis à jour avec les versions.
          </p>

          {/*
           * Avouer l'âge du fil plutôt que d'attendre que le praticien
           * découvre lui-même qu'il lit une information périmée.
           */}
          {perime ? (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <strong className="font-semibold">Ce fil a {age} mois.</strong> Au-delà de{' '}
              {MOIS_AVANT_PEREMPTION} mois, une absence de nouvelle est plus probablement un défaut
              de mise à jour qu’un calme du secteur. Mettez le logiciel à jour, ou considérez ce fil
              comme un point de départ à recouper.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltre('tout')}
              className={cx(
                'rounded-full border px-3 py-1 text-sm transition',
                filtre === 'tout'
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              Tout ({entrees.length})
            </button>
            {presentes.map((c) => {
              const n = entrees.filter((e) => e.categorie === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFiltre(c)}
                  className={cx(
                    'rounded-full border px-3 py-1 text-sm transition',
                    filtre === c
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  {LIBELLE_CATEGORIE[c]} ({n})
                </button>
              );
            })}
          </div>

          <dl className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
            {(Object.keys(LIBELLE_MATURITE) as MaturiteVeille[]).map((m) => (
              <div key={m} className="flex items-start gap-2">
                <dt className="shrink-0">
                  <Badge ton={TON_MATURITE[m]}>{LIBELLE_MATURITE[m]}</Badge>
                </dt>
                <dd className="text-xs leading-relaxed text-slate-600">{EXPLICATION_MATURITE[m]}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {visibles.map((e) => (
          <Entree key={e.id} entree={e} neuve={neuves.has(e.id)} />
        ))}
      </div>
    </div>
  );
}
