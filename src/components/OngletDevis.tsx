import { useMemo, useState } from 'react';
import type { Devis, LigneDevis, Patient, VarianteDevis } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { actesDe, categoriesDe, tauxRegime, trouverActeDans } from '@/data/nomenclatures';
import { devisExpire, totauxVariante } from '@/lib/finance';
import { aujourdHui, cx, formatDate, formatMontant, uid } from '@/lib/utils';

const TON_STATUT = {
  brouillon: 'neutre',
  presente: 'info',
  accepte: 'succes',
  refuse: 'danger',
  expire: 'alerte',
} as const;

const LIBELLE_STATUT = {
  brouillon: 'Brouillon',
  presente: 'Présenté',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
} as const;

function ligneVide(nomenclature: string): LigneDevis {
  const m = actesDe(nomenclature)[0];
  return {
    id: uid('lig'),
    codeActe: m.code,
    libelle: m.libelle,
    dents: [],
    quantite: 1,
    tarif: m.tarif,
    tarifReference: m.tarifReference,
  };
}

function varianteVide(nom: string, nomenclature: string): VarianteDevis {
  return { id: uid('var'), nom, description: '', lignes: [ligneVide(nomenclature)] };
}

/** Édition d'une option thérapeutique : ses lignes d'actes et son total. */
function EditeurVariante({
  variante,
  onChange,
  onSupprimer,
  devise,
  nomenclature,
  taux,
}: {
  variante: VarianteDevis;
  onChange: (v: VarianteDevis) => void;
  onSupprimer: () => void;
  devise: string;
  nomenclature: string;
  taux: number;
}) {
  const t = totauxVariante(variante, taux);
  const majLigne = (id: string, patch: Partial<LigneDevis>) =>
    onChange({ ...variante, lignes: variante.lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Input
          value={variante.nom}
          onChange={(e) => onChange({ ...variante, nom: e.target.value })}
          placeholder="Nom de l’option"
          className="font-semibold"
          aria-label="Nom de l’option"
        />
        <Button variante="fantome" onClick={onSupprimer} aria-label="Supprimer l’option">
          ✕
        </Button>
      </div>
      <Textarea
        rows={2}
        value={variante.description}
        onChange={(e) => onChange({ ...variante, description: e.target.value })}
        placeholder="Ce que cette option apporte, ce qu’elle implique…"
        className="mb-2"
      />

      <div className="space-y-2">
        {variante.lignes.map((l) => (
          <div key={l.id} className="grid gap-2 sm:grid-cols-[1fr_90px_100px_100px_32px]">
            <Select
              value={l.codeActe}
              aria-label="Acte"
              onChange={(e) => {
                const m = trouverActeDans(nomenclature, e.target.value);
                if (!m) return;
                majLigne(l.id, {
                  codeActe: m.code,
                  libelle: m.libelle,
                  tarif: m.tarif,
                  tarifReference: m.tarifReference,
                });
              }}
            >
              {categoriesDe(nomenclature).map((cat) => (
                <optgroup key={cat} label={cat}>
                  {actesDe(nomenclature)
                    .filter((a) => a.categorie === cat)
                    .map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.libelle}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
            <Input
              value={l.dents.join(', ')}
              placeholder="dents"
              aria-label="Dents"
              onChange={(e) =>
                majLigne(l.id, {
                  dents: e.target.value
                    .split(',')
                    .map((x) => Number.parseInt(x.trim(), 10))
                    .filter((n) => Number.isFinite(n)),
                })
              }
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              value={l.tarif}
              aria-label="Honoraires"
              onChange={(e) => majLigne(l.id, { tarif: Number(e.target.value) })}
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              value={l.tarifReference}
              aria-label="Base de remboursement"
              onChange={(e) => majLigne(l.id, { tarifReference: Number(e.target.value) })}
            />
            <Button
              variante="fantome"
              aria-label="Supprimer la ligne"
              onClick={() => onChange({ ...variante, lignes: variante.lignes.filter((x) => x.id !== l.id) })}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Button
          taille="sm"
          variante="secondaire"
          onClick={() => onChange({ ...variante, lignes: [...variante.lignes, ligneVide(nomenclature)] })}
        >
          + Ligne
        </Button>
        <p className="text-sm">
          <span className="font-semibold text-slate-800">{formatMontant(t.total, devise)}</span>
          <span className="ml-2 text-slate-500">reste {formatMontant(t.resteACharge, devise)}</span>
        </p>
      </div>
    </div>
  );
}

const COLONNES: Record<number, string> = {
  0: '',
  1: '',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
};

/** Présentation côte à côte des options, telle qu'elle est montrée au patient. */
function Comparateur({
  devis,
  devise,
  taux,
  onChoisir,
}: {
  devis: Devis;
  devise: string;
  taux: number;
  onChoisir?: (varianteId: string) => void;
}) {
  const totaux = devis.variantes.map((v) => totauxVariante(v, taux));
  const moinsCher = Math.min(...totaux.map((t) => t.resteACharge));

  return (
    // Classes statiques : Tailwind ne peut pas extraire un nom de classe construit.
    <div className={cx('grid gap-4', COLONNES[Math.min(3, devis.variantes.length)])}>
      {devis.variantes.map((v, i) => {
        const t = totaux[i];
        const choisie = devis.varianteAcceptee === v.id;
        return (
          <div
            key={v.id}
            className={cx(
              'flex flex-col rounded-xl border p-4',
              choisie ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white',
            )}
          >
            <div className="mb-1 flex items-center gap-2">
              <h4 className="font-bold text-slate-900">{v.nom}</h4>
              {choisie ? <Badge ton="succes">Retenue</Badge> : null}
              {t.resteACharge === moinsCher && devis.variantes.length > 1 ? (
                <Badge ton="info">Reste à charge le plus bas</Badge>
              ) : null}
            </div>
            {v.description ? <p className="mb-3 text-sm text-slate-600">{v.description}</p> : null}

            <ul className="mb-3 space-y-1 text-sm">
              {v.lignes.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span className="text-slate-700">
                    {l.libelle}
                    {l.dents.length ? <span className="text-slate-400"> — {l.dents.join(', ')}</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-600">
                    {formatMontant(l.quantite * l.tarif, devise)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-auto space-y-1 border-t border-slate-200 pt-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Honoraires</dt>
                <dd className="font-semibold text-slate-800">{formatMontant(t.total, devise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Pris en charge</dt>
                <dd className="text-slate-600">{formatMontant(t.remboursement, devise)}</dd>
              </div>
              <div className="flex justify-between text-base">
                <dt className="font-semibold text-slate-700">Reste à charge</dt>
                <dd className="font-bold text-rose-700">{formatMontant(t.resteACharge, devise)}</dd>
              </div>
            </dl>

            {onChoisir ? (
              <Button
                className="no-print mt-3 w-full"
                variante={choisie ? 'succes' : 'secondaire'}
                onClick={() => onChoisir(v.id)}
              >
                {choisie ? 'Option retenue' : 'Retenir cette option'}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function OngletDevis({ patient }: { patient: Patient }) {
  const { data, praticienActif, ajouterDevis, majDevis, supprimerDevis, deciderDevis, basculerDevisEnPlan } =
    useApp();
  const devise = data.cabinet.devise;
  const nomenclature = data.cabinet.nomenclature;
  const taux = tauxRegime(nomenclature, patient.regime);
  const [edition, setEdition] = useState<Omit<Devis, 'id' | 'creeLe' | 'numero'> | null>(null);
  const [message, setMessage] = useState('');

  const liste = useMemo(
    () => data.devis.filter((d) => d.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date)),
    [data.devis, patient.id],
  );

  const ouvrirCreation = () =>
    setEdition({
      patientId: patient.id,
      date: aujourdHui(),
      praticien: praticienActif,
      variantes: [varianteVide('Option recommandée', nomenclature), varianteVide('Alternative', nomenclature)],
      varianteAcceptee: null,
      dateDecision: null,
      statut: 'presente',
      validiteJours: 90,
      notes: '',
    });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          titre="Devis et options thérapeutiques"
          sousTitre="Plusieurs solutions comparées côte à côte, pour un consentement vraiment éclairé"
          action={<Button onClick={ouvrirCreation}>+ Nouveau devis</Button>}
        />
        {liste.length === 0 ? (
          <EmptyState
            titre="Aucun devis"
            description="Présentez deux ou trois options chiffrées : le patient compare, choisit, et le plan de traitement se construit tout seul."
            action={<Button onClick={ouvrirCreation}>+ Nouveau devis</Button>}
          />
        ) : (
          <CardBody className="space-y-6">
            {message ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}

            {liste.map((d) => {
              const expire = devisExpire(d);
              const statut = expire && d.statut === 'presente' ? 'expire' : d.statut;
              return (
                <section key={d.id} className="rounded-xl border border-slate-200">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {d.numero}
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          du {formatDate(d.date)} · {d.praticien}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Validité {d.validiteJours} jours
                        {d.dateDecision ? ` · décision le ${formatDate(d.dateDecision)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge ton={TON_STATUT[statut]}>{LIBELLE_STATUT[statut]}</Badge>
                      {d.statut === 'accepte' ? (
                        <Button
                          taille="sm"
                          onClick={() => {
                            const n = basculerDevisEnPlan(d.id);
                            setMessage(`${n} acte(s) ajoutés au plan de traitement depuis ${d.numero}.`);
                          }}
                        >
                          Basculer dans le plan
                        </Button>
                      ) : null}
                      <Button taille="sm" variante="secondaire" onClick={() => window.print()}>
                        Imprimer
                      </Button>
                      <Button taille="sm" variante="fantome" onClick={() => supprimerDevis(d.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </header>

                  <div className="p-4">
                    <Comparateur
                      devis={d}
                      devise={devise}
                      taux={taux}
                      onChoisir={(varianteId) =>
                        deciderDevis(d.id, d.varianteAcceptee === varianteId ? null : varianteId)
                      }
                    />
                    {d.notes ? <p className="mt-3 text-sm text-slate-500">{d.notes}</p> : null}
                    {d.statut === 'presente' ? (
                      <div className="no-print mt-3 flex flex-wrap gap-2">
                        <Button taille="sm" variante="secondaire" onClick={() => deciderDevis(d.id, null)}>
                          Noter un refus
                        </Button>
                        <Button
                          taille="sm"
                          variante="fantome"
                          onClick={() => majDevis(d.id, { validiteJours: d.validiteJours + 30 })}
                        >
                          Prolonger de 30 jours
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </CardBody>
        )}
      </Card>

      <Modal
        ouvert={edition !== null}
        titre="Nouveau devis"
        sousTitre="Comparez deux ou trois solutions : le patient choisit en connaissance de cause."
        onFermer={() => setEdition(null)}
        largeur="xl"
        pied={
          <>
            <Button variante="secondaire" onClick={() => setEdition(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!edition) return;
                const valides = edition.variantes.filter((v) => v.nom.trim() && v.lignes.length > 0);
                if (valides.length === 0) return;
                ajouterDevis({ ...edition, variantes: valides });
                setEdition(null);
              }}
            >
              Créer le devis
            </Button>
          </>
        }
      >
        {edition ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Date">
                <Input
                  type="date"
                  value={edition.date}
                  onChange={(e) => setEdition({ ...edition, date: e.target.value })}
                />
              </Field>
              <Field label="Validité (jours)">
                <Input
                  type="number"
                  min={1}
                  value={edition.validiteJours}
                  onChange={(e) => setEdition({ ...edition, validiteJours: Number(e.target.value) })}
                />
              </Field>
              <Field label="Praticien">
                <Select
                  value={edition.praticien}
                  onChange={(e) => setEdition({ ...edition, praticien: e.target.value })}
                >
                  {data.cabinet.praticiens.map((p) => (
                    <option key={p.id} value={p.nom}>
                      {p.nom}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="space-y-3">
              {edition.variantes.map((v, i) => (
                <EditeurVariante
                  key={v.id}
                  variante={v}
                  devise={devise}
                  nomenclature={nomenclature}
                  taux={taux}
                  onChange={(maj) =>
                    setEdition({
                      ...edition,
                      variantes: edition.variantes.map((x, j) => (j === i ? maj : x)),
                    })
                  }
                  onSupprimer={() =>
                    setEdition({ ...edition, variantes: edition.variantes.filter((_, j) => j !== i) })
                  }
                />
              ))}
            </div>

            <Button
              variante="secondaire"
              onClick={() =>
                setEdition({
                  ...edition,
                  variantes: [
                    ...edition.variantes,
                    varianteVide(`Option ${edition.variantes.length + 1}`, nomenclature),
                  ],
                })
              }
            >
              + Ajouter une option
            </Button>

            <Field label="Notes">
              <Textarea
                rows={2}
                value={edition.notes}
                onChange={(e) => setEdition({ ...edition, notes: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
