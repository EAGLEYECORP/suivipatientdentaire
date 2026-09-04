import { useEffect, useMemo, useState } from 'react';
import type { Acte, Face, StatutActe } from '@/types';
import { useApp } from '@/store/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { CATALOGUE_ACTES, CATEGORIES_ACTES, trouverActe } from '@/data/actes';
import { LIBELLE_FACE, facesDisponibles, toutesLesDents } from '@/data/teeth';
import { aujourdHui, cx } from '@/lib/utils';

export type BrouillonActe = Omit<Acte, 'id' | 'creeLe'>;

interface Props {
  ouvert: boolean;
  acte?: Acte;
  patientId?: string;
  dentsPreselectionnees?: number[];
  onFermer: () => void;
  onEnregistrer: (a: BrouillonActe) => void;
  onSupprimer?: () => void;
}

export function ActeForm({
  ouvert,
  acte,
  patientId,
  dentsPreselectionnees = [],
  onFermer,
  onEnregistrer,
  onSupprimer,
}: Props) {
  const { data, odontogramme } = useApp();
  const [brouillon, setBrouillon] = useState<BrouillonActe | null>(null);
  const [erreur, setErreur] = useState('');

  const patientsTries = useMemo(
    () => [...data.patients].sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')),
    [data.patients],
  );

  useEffect(() => {
    if (!ouvert) return;
    setErreur('');
    if (acte) {
      const { id: _id, creeLe: _c, ...reste } = acte;
      setBrouillon(reste);
      return;
    }
    const modele = CATALOGUE_ACTES[0];
    setBrouillon({
      patientId: patientId ?? patientsTries[0]?.id ?? '',
      dents: dentsPreselectionnees,
      faces: [],
      codeActe: modele.code,
      libelle: modele.libelle,
      statut: 'planifie',
      tarif: modele.tarif,
      baseRemboursement: modele.baseRemboursement,
      seance: 1,
      praticien: data.cabinet.praticiens[0]?.nom ?? '',
      datePrevue: aujourdHui(),
      dateRealisation: null,
      rdvId: null,
      notes: '',
    });
  }, [ouvert, acte, patientId, dentsPreselectionnees, patientsTries, data.cabinet.praticiens]);

  if (!brouillon) {
    return (
      <Modal ouvert={ouvert} titre="Acte" onFermer={onFermer}>
        <p className="text-sm text-slate-500">Chargement…</p>
      </Modal>
    );
  }

  const set = <K extends keyof BrouillonActe>(cle: K, valeur: BrouillonActe[K]) =>
    setBrouillon((b) => (b ? { ...b, [cle]: valeur } : b));

  const dentition = odontogramme(brouillon.patientId).dentition;
  const dentsPossibles = toutesLesDents(dentition);

  const facesUtilisables: Face[] = brouillon.dents.length
    ? Array.from(new Set(brouillon.dents.flatMap((n) => facesDisponibles(n))))
    : (['M', 'D', 'V', 'L', 'O'] as Face[]);

  const choisirModele = (code: string) => {
    const m = trouverActe(code);
    if (!m) return;
    setBrouillon((b) =>
      b
        ? {
            ...b,
            codeActe: m.code,
            libelle: m.libelle,
            tarif: m.tarif,
            baseRemboursement: m.baseRemboursement,
            dents: m.cible === 'general' ? [] : b.dents,
          }
        : b,
    );
  };

  const basculerDent = (n: number) =>
    set('dents', brouillon.dents.includes(n) ? brouillon.dents.filter((x) => x !== n) : [...brouillon.dents, n].sort((a, b) => a - b));

  const basculerFace = (f: Face) =>
    set('faces', brouillon.faces.includes(f) ? brouillon.faces.filter((x) => x !== f) : [...brouillon.faces, f]);

  const enregistrer = () => {
    if (!brouillon.patientId) {
      setErreur('Sélectionnez un patient.');
      return;
    }
    if (!brouillon.libelle.trim()) {
      setErreur('Le libellé de l’acte est obligatoire.');
      return;
    }
    if (brouillon.tarif < 0 || brouillon.baseRemboursement < 0) {
      setErreur('Les montants ne peuvent pas être négatifs.');
      return;
    }
    onEnregistrer({
      ...brouillon,
      dateRealisation:
        brouillon.statut === 'realise' ? brouillon.dateRealisation ?? brouillon.datePrevue : null,
    });
  };

  return (
    <Modal
      ouvert={ouvert}
      titre={acte ? 'Modifier l’acte' : 'Ajouter un acte au plan de traitement'}
      onFermer={onFermer}
      largeur="lg"
      pied={
        <>
          {onSupprimer ? (
            <Button variante="danger" onClick={onSupprimer} className="mr-auto">
              Supprimer
            </Button>
          ) : null}
          <Button variante="secondaire" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={enregistrer}>Enregistrer</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!patientId ? (
          <Field label="Patient" className="sm:col-span-2">
            <Select value={brouillon.patientId} onChange={(e) => set('patientId', e.target.value)}>
              {patientsTries.length === 0 ? <option value="">Aucun patient enregistré</option> : null}
              {patientsTries.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom.toUpperCase()} {p.prenom}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Acte du catalogue (CCAM)" className="sm:col-span-2">
          <Select value={brouillon.codeActe} onChange={(e) => choisirModele(e.target.value)}>
            {CATEGORIES_ACTES.map((cat) => (
              <optgroup key={cat} label={cat}>
                {CATALOGUE_ACTES.filter((a) => a.categorie === cat).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.libelle}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Libellé" className="sm:col-span-2">
          <Input value={brouillon.libelle} onChange={(e) => set('libelle', e.target.value)} />
        </Field>

        <div className="sm:col-span-2">
          <span className="etiquette">Dents concernées ({brouillon.dents.length})</span>
          <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {dentsPossibles.map((n) => {
              const actif = brouillon.dents.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => basculerDent(n)}
                  className={cx(
                    'h-8 w-9 rounded border text-xs font-semibold transition',
                    actif
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300',
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <span className="mt-1 block text-xs text-slate-400">
            Laisser vide pour un acte général (détartrage, radio panoramique…).
          </span>
        </div>

        <div className="sm:col-span-2">
          <span className="etiquette">Faces traitées</span>
          <div className="flex flex-wrap gap-1.5">
            {facesUtilisables.map((f) => {
              const actif = brouillon.faces.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => basculerFace(f)}
                  className={cx(
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    actif
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300',
                  )}
                >
                  {f} · {LIBELLE_FACE[f]}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Statut">
          <Select value={brouillon.statut} onChange={(e) => set('statut', e.target.value as StatutActe)}>
            <option value="planifie">Planifié</option>
            <option value="en_cours">En cours</option>
            <option value="realise">Réalisé</option>
            <option value="annule">Annulé</option>
          </Select>
        </Field>
        <Field label="Séance n°">
          <Input
            type="number"
            min={1}
            value={brouillon.seance}
            onChange={(e) => set('seance', Math.max(1, Number(e.target.value)))}
          />
        </Field>
        <Field label="Honoraires (€)">
          <Input
            type="number"
            step="0.01"
            min={0}
            value={brouillon.tarif}
            onChange={(e) => set('tarif', Number(e.target.value))}
          />
        </Field>
        <Field label="Base de remboursement (€)" aide="Part prise en charge par l’Assurance maladie.">
          <Input
            type="number"
            step="0.01"
            min={0}
            value={brouillon.baseRemboursement}
            onChange={(e) => set('baseRemboursement', Number(e.target.value))}
          />
        </Field>
        <Field label="Praticien">
          <Select value={brouillon.praticien} onChange={(e) => set('praticien', e.target.value)}>
            {data.cabinet.praticiens.map((p) => (
              <option key={p.id} value={p.nom}>
                {p.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date prévue">
          <Input
            type="date"
            value={brouillon.datePrevue}
            onChange={(e) => set('datePrevue', e.target.value)}
          />
        </Field>
        {brouillon.statut === 'realise' ? (
          <Field label="Date de réalisation">
            <Input
              type="date"
              value={brouillon.dateRealisation ?? brouillon.datePrevue}
              onChange={(e) => set('dateRealisation', e.target.value)}
            />
          </Field>
        ) : null}
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={brouillon.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Reste à charge estimé :{' '}
        <strong>{Math.max(0, brouillon.tarif - brouillon.baseRemboursement).toFixed(2)} €</strong>
      </p>
      {erreur ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      ) : null}
    </Modal>
  );
}
