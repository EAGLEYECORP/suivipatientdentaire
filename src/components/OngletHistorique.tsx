import { useMemo, useState } from 'react';
import type { EvenementJournal, Patient, TypeEvenement } from '@/types';
import { useApp } from '@/store/AppContext';
import { journalPatient } from '@/lib/historique';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, type TonBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { formatDateHeure } from '@/lib/utils';

/**
 * Historique du dossier.
 *
 * Le journal existait depuis le début, inviolable, et servait à la remontée
 * temporelle et à la biographie d'une dent. Il n'était affiché nulle part
 * comme suite d'événements : un praticien ne pouvait pas lire ce qui s'était
 * passé dans un dossier, et une écriture comme l'invalidation d'un cycle de
 * stérilisation n'atteignait personne.
 */

/* Regroupement par nature, pour filtrer sans énumérer trente types. */
const FAMILLES = {
  soin: 'Soins et schéma',
  administratif: 'Administratif',
  argent: 'Devis et facturation',
  securite: 'Sécurité et traçabilité',
} as const;

type Famille = keyof typeof FAMILLES;

const FAMILLE_PAR_TYPE: Partial<Record<TypeEvenement, Famille>> = {
  'dent.maj': 'soin',
  'dent.reset': 'soin',
  'dentition.maj': 'soin',
  'perio.enregistre': 'soin',
  'acte.cree': 'soin',
  'acte.maj': 'soin',
  'acte.supprime': 'soin',
  'note.cree': 'soin',
  'note.supprime': 'soin',
  'image.ajoutee': 'soin',
  'image.supprimee': 'soin',
  'ordonnance.cree': 'soin',
  'patient.cree': 'administratif',
  'patient.maj': 'administratif',
  'patient.supprime': 'administratif',
  'rdv.cree': 'administratif',
  'rdv.maj': 'administratif',
  'rdv.supprime': 'administratif',
  'facture.cree': 'argent',
  'facture.maj': 'argent',
  'facture.supprime': 'argent',
  'paiement.ajoute': 'argent',
  'paiement.supprime': 'argent',
  'devis.cree': 'argent',
  'devis.maj': 'argent',
  'devis.decide': 'argent',
  'sterilisation.utilisation': 'securite',
  'sterilisation.invalidation': 'securite',
};

const TON_FAMILLE: Record<Famille, TonBadge> = {
  soin: 'info',
  administratif: 'neutre',
  argent: 'violet',
  securite: 'alerte',
};

function familleDe(e: EvenementJournal): Famille {
  return FAMILLE_PAR_TYPE[e.type] ?? 'administratif';
}

/* Les événements qui demandent une action sautent aux yeux. */
function estAlerte(e: EvenementJournal): boolean {
  return e.type === 'sterilisation.invalidation';
}

export function OngletHistorique({ patient }: { patient: Patient }) {
  const { data } = useApp();
  const [famille, setFamille] = useState<Famille | 'tout'>('tout');

  const evenements = useMemo(() => journalPatient(data.journal, patient.id), [data.journal, patient.id]);
  const visibles = famille === 'tout' ? evenements : evenements.filter((e) => familleDe(e) === famille);
  const alertes = evenements.filter(estAlerte);

  return (
    <Card>
      <CardHeader
        titre="Historique du dossier"
        sousTitre={`${evenements.length} écriture(s) · journal en ajout seul, jamais modifié ni purgé`}
        action={
          <Select value={famille} onChange={(e) => setFamille(e.target.value as Famille | 'tout')}>
            <option value="tout">Tout</option>
            {(Object.keys(FAMILLES) as Famille[]).map((f) => (
              <option key={f} value={f}>
                {FAMILLES[f]}
              </option>
            ))}
          </Select>
        }
      />
      <CardBody className="space-y-4">
        {alertes.length ? (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2">
            <p className="text-sm font-semibold text-red-900">
              {alertes.length} événement(s) de traçabilité à vérifier
            </p>
            {alertes.map((a) => (
              <p key={a.id} className="mt-1 text-sm text-red-800">
                {a.resume}
              </p>
            ))}
          </div>
        ) : null}

        {visibles.length === 0 ? (
          <EmptyState
            titre="Aucune écriture"
            description="Chaque modification du dossier s’inscrira ici, avec sa date et son auteur."
          />
        ) : (
          <ol className="relative space-y-0 border-l border-slate-200 pl-4">
            {visibles.map((e) => {
              const f = familleDe(e);
              return (
                <li key={e.id} className="relative py-2.5">
                  <span
                    className={
                      estAlerte(e)
                        ? 'absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-white'
                        : 'absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white'
                    }
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs tabular-nums text-slate-500">{formatDateHeure(e.date)}</span>
                    <Badge ton={TON_FAMILLE[f]}>{FAMILLES[f]}</Badge>
                    {e.dent !== null ? <Badge>Dent {e.dent}</Badge> : null}
                    <span className="ml-auto text-xs text-slate-400">{e.auteur}</span>
                  </div>
                  <p
                    className={
                      estAlerte(e)
                        ? 'mt-1 text-sm font-medium text-red-800'
                        : 'mt-1 text-sm text-slate-700'
                    }
                  >
                    {e.resume}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
