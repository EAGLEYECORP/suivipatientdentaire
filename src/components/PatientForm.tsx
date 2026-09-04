import { useEffect, useState } from 'react';
import type { Patient, Sexe } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, ListeTexte, Select, Textarea } from '@/components/ui/Field';

export type BrouillonPatient = Omit<Patient, 'id' | 'creeLe' | 'majLe'>;

export function patientVide(): BrouillonPatient {
  return {
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: 'F',
    telephone: '',
    email: '',
    adresse: '',
    numeroSecu: '',
    mutuelle: '',
    medecinTraitant: '',
    allergies: [],
    antecedents: [],
    traitementsEnCours: [],
    alertes: [],
    notes: '',
    actif: true,
  };
}

interface Props {
  ouvert: boolean;
  patient?: Patient;
  onFermer: () => void;
  onEnregistrer: (p: BrouillonPatient) => void;
}

export function PatientForm({ ouvert, patient, onFermer, onEnregistrer }: Props) {
  const [brouillon, setBrouillon] = useState<BrouillonPatient>(patientVide());
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ouvert) return;
    if (patient) {
      const { id: _id, creeLe: _c, majLe: _m, ...reste } = patient;
      setBrouillon(reste);
    } else {
      setBrouillon(patientVide());
    }
    setErreurs({});
  }, [ouvert, patient]);

  const set = <K extends keyof BrouillonPatient>(cle: K, valeur: BrouillonPatient[K]) =>
    setBrouillon((b) => ({ ...b, [cle]: valeur }));

  const valider = (): boolean => {
    const e: Record<string, string> = {};
    if (!brouillon.nom.trim()) e.nom = 'Le nom est obligatoire.';
    if (!brouillon.prenom.trim()) e.prenom = 'Le prénom est obligatoire.';
    if (!brouillon.dateNaissance) e.dateNaissance = 'La date de naissance est obligatoire.';
    else if (new Date(brouillon.dateNaissance) > new Date()) e.dateNaissance = 'Date dans le futur.';
    if (brouillon.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brouillon.email))
      e.email = 'Adresse e-mail invalide.';
    if (!brouillon.telephone.trim()) e.telephone = 'Le téléphone est obligatoire.';
    setErreurs(e);
    return Object.keys(e).length === 0;
  };

  const enregistrer = () => {
    if (!valider()) return;
    onEnregistrer({
      ...brouillon,
      nom: brouillon.nom.trim(),
      prenom: brouillon.prenom.trim(),
    });
  };

  return (
    <Modal
      ouvert={ouvert}
      titre={patient ? 'Modifier le dossier patient' : 'Nouveau patient'}
      sousTitre="Les champs marqués d’une * sont obligatoires."
      onFermer={onFermer}
      largeur="lg"
      pied={
        <>
          <Button variante="secondaire" onClick={onFermer}>
            Annuler
          </Button>
          <Button onClick={enregistrer}>{patient ? 'Enregistrer' : 'Créer le dossier'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom *">
          <Input value={brouillon.nom} onChange={(e) => set('nom', e.target.value)} autoFocus />
          {erreurs.nom ? <span className="mt-1 block text-xs text-red-600">{erreurs.nom}</span> : null}
        </Field>
        <Field label="Prénom *">
          <Input value={brouillon.prenom} onChange={(e) => set('prenom', e.target.value)} />
          {erreurs.prenom ? <span className="mt-1 block text-xs text-red-600">{erreurs.prenom}</span> : null}
        </Field>
        <Field label="Date de naissance *">
          <Input
            type="date"
            value={brouillon.dateNaissance}
            onChange={(e) => set('dateNaissance', e.target.value)}
          />
          {erreurs.dateNaissance ? (
            <span className="mt-1 block text-xs text-red-600">{erreurs.dateNaissance}</span>
          ) : null}
        </Field>
        <Field label="Sexe">
          <Select value={brouillon.sexe} onChange={(e) => set('sexe', e.target.value as Sexe)}>
            <option value="F">Féminin</option>
            <option value="M">Masculin</option>
            <option value="Autre">Autre</option>
          </Select>
        </Field>
        <Field label="Téléphone *">
          <Input value={brouillon.telephone} onChange={(e) => set('telephone', e.target.value)} />
          {erreurs.telephone ? (
            <span className="mt-1 block text-xs text-red-600">{erreurs.telephone}</span>
          ) : null}
        </Field>
        <Field label="E-mail">
          <Input type="email" value={brouillon.email} onChange={(e) => set('email', e.target.value)} />
          {erreurs.email ? <span className="mt-1 block text-xs text-red-600">{erreurs.email}</span> : null}
        </Field>
        <Field label="Adresse" className="sm:col-span-2">
          <Input value={brouillon.adresse} onChange={(e) => set('adresse', e.target.value)} />
        </Field>
        <Field label="N° de sécurité sociale">
          <Input value={brouillon.numeroSecu} onChange={(e) => set('numeroSecu', e.target.value)} />
        </Field>
        <Field label="Mutuelle">
          <Input value={brouillon.mutuelle} onChange={(e) => set('mutuelle', e.target.value)} />
        </Field>
        <Field label="Médecin traitant" className="sm:col-span-2">
          <Input
            value={brouillon.medecinTraitant}
            onChange={(e) => set('medecinTraitant', e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <h3 className="mb-2 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-700">
            Dossier médical
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <ListeTexte
              label="Allergies"
              valeur={brouillon.allergies}
              onChange={(v) => set('allergies', v)}
              placeholder="Pénicilline, Latex…"
            />
            <ListeTexte
              label="Antécédents"
              valeur={brouillon.antecedents}
              onChange={(v) => set('antecedents', v)}
              placeholder="Diabète, Hypertension…"
            />
            <ListeTexte
              label="Traitements en cours"
              valeur={brouillon.traitementsEnCours}
              onChange={(v) => set('traitementsEnCours', v)}
              placeholder="Anticoagulant…"
            />
            <ListeTexte
              label="Alertes"
              valeur={brouillon.alertes}
              onChange={(v) => set('alertes', v)}
              placeholder="Risque d’endocardite…"
            />
          </div>
        </div>

        <Field label="Notes administratives" className="sm:col-span-2">
          <Textarea rows={3} value={brouillon.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
          <input
            type="checkbox"
            checked={brouillon.actif}
            onChange={(e) => set('actif', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Patient actif (suivi en cours)
        </label>
      </div>
    </Modal>
  );
}
