import { useEffect, useMemo, useState } from 'react';
import type { RendezVous, StatutRdv } from '@/types';
import { useApp } from '@/store/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { isoLocal } from '@/lib/utils';

export type BrouillonRdv = Omit<RendezVous, 'id' | 'creeLe'>;

interface Props {
  ouvert: boolean;
  rdv?: RendezVous;
  patientIdImpose?: string;
  debutPropose?: string;
  onFermer: () => void;
  onEnregistrer: (r: BrouillonRdv) => void;
  onSupprimer?: () => void;
}

const SALLES = ['Salle 1', 'Salle 2', 'Salle 3'];

export function RdvForm({
  ouvert,
  rdv,
  patientIdImpose,
  debutPropose,
  onFermer,
  onEnregistrer,
  onSupprimer,
}: Props) {
  const { data } = useApp();
  const [brouillon, setBrouillon] = useState<BrouillonRdv | null>(null);
  const [erreur, setErreur] = useState('');

  const patientsTries = useMemo(
    () => [...data.patients].sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')),
    [data.patients],
  );

  useEffect(() => {
    if (!ouvert) return;
    setErreur('');
    if (rdv) {
      const { id: _id, creeLe: _c, ...reste } = rdv;
      setBrouillon(reste);
      return;
    }
    const debut = debutPropose ?? (() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
      return d.toISOString();
    })();
    setBrouillon({
      patientId: patientIdImpose ?? patientsTries[0]?.id ?? '',
      debut,
      duree: data.cabinet.dureeRdvDefaut,
      motif: '',
      praticien: data.cabinet.praticiens[0]?.nom ?? '',
      salle: SALLES[0],
      statut: 'prevu',
      notes: '',
      rappelEnvoye: false,
    });
  }, [ouvert, rdv, patientIdImpose, debutPropose, data.cabinet, patientsTries]);

  if (!brouillon) {
    return (
      <Modal ouvert={ouvert} titre="Rendez-vous" onFermer={onFermer}>
        <p className="text-sm text-slate-500">Chargement…</p>
      </Modal>
    );
  }

  const set = <K extends keyof BrouillonRdv>(cle: K, valeur: BrouillonRdv[K]) =>
    setBrouillon((b) => (b ? { ...b, [cle]: valeur } : b));

  const enregistrer = () => {
    if (!brouillon.patientId) {
      setErreur('Sélectionnez un patient. Créez d’abord un dossier si la liste est vide.');
      return;
    }
    if (!brouillon.motif.trim()) {
      setErreur('Indiquez le motif de la consultation.');
      return;
    }
    if (brouillon.duree <= 0) {
      setErreur('La durée doit être supérieure à zéro.');
      return;
    }
    const conflit = data.rendezVous.find((r) => {
      if (r.id === rdv?.id) return false;
      if (r.praticien !== brouillon.praticien) return false;
      if (r.statut === 'annule') return false;
      const d1 = new Date(r.debut).getTime();
      const f1 = d1 + r.duree * 60000;
      const d2 = new Date(brouillon.debut).getTime();
      const f2 = d2 + brouillon.duree * 60000;
      return d2 < f1 && d1 < f2;
    });
    if (conflit) {
      const p = data.patients.find((x) => x.id === conflit.patientId);
      setErreur(
        `Créneau déjà occupé par ${brouillon.praticien} (${p ? `${p.prenom} ${p.nom}` : 'patient'}). Choisissez un autre horaire ou praticien.`,
      );
      return;
    }
    onEnregistrer(brouillon);
  };

  return (
    <Modal
      ouvert={ouvert}
      titre={rdv ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
      onFermer={onFermer}
      largeur="md"
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
        <Field label="Patient" className="sm:col-span-2">
          <Select
            value={brouillon.patientId}
            onChange={(e) => set('patientId', e.target.value)}
            disabled={!!patientIdImpose}
          >
            {patientsTries.length === 0 ? <option value="">Aucun patient enregistré</option> : null}
            {patientsTries.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom.toUpperCase()} {p.prenom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date et heure">
          <Input
            type="datetime-local"
            value={isoLocal(new Date(brouillon.debut))}
            onChange={(e) => set('debut', new Date(e.target.value).toISOString())}
          />
        </Field>
        <Field label="Durée (minutes)">
          <Select value={brouillon.duree} onChange={(e) => set('duree', Number(e.target.value))}>
            {[15, 20, 30, 40, 45, 60, 75, 90, 120].map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Motif" className="sm:col-span-2">
          <Input
            value={brouillon.motif}
            onChange={(e) => set('motif', e.target.value)}
            placeholder="Obturation 26, contrôle, urgence…"
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
        <Field label="Salle">
          <Select value={brouillon.salle} onChange={(e) => set('salle', e.target.value)}>
            {SALLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Statut">
          <Select value={brouillon.statut} onChange={(e) => set('statut', e.target.value as StatutRdv)}>
            <option value="prevu">Prévu</option>
            <option value="confirme">Confirmé</option>
            <option value="en_salle">En salle</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
            <option value="absent">Absent</option>
          </Select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={brouillon.rappelEnvoye}
            onChange={(e) => set('rappelEnvoye', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Rappel envoyé
        </label>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={3} value={brouillon.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      {erreur ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      ) : null}
    </Modal>
  );
}
