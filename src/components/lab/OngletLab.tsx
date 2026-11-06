import { useMemo, useState } from 'react';
import type { OrdreLab, TypeOrdreLab, StatutOrdreLab } from '@/types';
import { useApp } from '@/store/AppContext';
import { maintenant } from '@/lib/utils';

const TYPES: { id: TypeOrdreLab; label: string }[] = [
  { id: 'couronne', label: 'Couronne' },
  { id: 'bridge', label: 'Bridge' },
  { id: 'facette', label: 'Facette' },
  { id: 'inlay_onlay', label: 'Inlay / Onlay' },
  { id: 'prothese_amovible', label: 'Prothèse amovible' },
  { id: 'implant_guide', label: 'Guide chirurgical' },
  { id: 'gouttiere', label: 'Gouttière' },
  { id: 'appareil_ortho', label: 'Appareil orthodontique' },
  { id: 'autre', label: 'Autre' },
];

const STATUTS: { id: StatutOrdreLab; label: string; couleur: string }[] = [
  { id: 'brouillon', label: 'Brouillon', couleur: 'bg-slate-100 text-slate-700' },
  { id: 'envoye', label: 'Envoyé', couleur: 'bg-blue-100 text-blue-800' },
  { id: 'en_fabrication', label: 'En fabrication', couleur: 'bg-amber-100 text-amber-800' },
  { id: 'recu', label: 'Reçu', couleur: 'bg-emerald-100 text-emerald-800' },
  { id: 'essaye', label: 'Essayé', couleur: 'bg-violet-100 text-violet-800' },
  { id: 'pose', label: 'Posé', couleur: 'bg-green-100 text-green-800' },
  { id: 'annule', label: 'Annulé', couleur: 'bg-red-100 text-red-700' },
];

interface Props {
  patientId: string;
}

export function OngletLab({ patientId }: Props) {
  const { data, praticienActif, ajouterOrdreLab, majOrdreLab, supprimerOrdreLab } = useApp();
  const ordres = useMemo(
    () => (data.ordresLab ?? []).filter((o) => o.patientId === patientId).sort((a, b) => b.creeLe.localeCompare(a.creeLe)),
    [data.ordresLab, patientId],
  );

  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState({
    type: 'couronne' as TypeOrdreLab,
    libelle: '',
    laboratoire: '',
    dents: '',
    teinte: '',
    materiau: '',
    instructions: '',
    datePrevue: '',
  });

  const creer = () => {
    if (!form.libelle.trim()) return;
    const dents = form.dents
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));
    ajouterOrdreLab({
      patientId,
      dents,
      type: form.type,
      libelle: form.libelle.trim(),
      laboratoire: form.laboratoire.trim(),
      dateEnvoi: null,
      datePrevue: form.datePrevue || null,
      dateReception: null,
      statut: 'brouillon',
      teinte: form.teinte.trim(),
      materiau: form.materiau.trim(),
      instructions: form.instructions.trim(),
      praticien: praticienActif,
      notes: '',
    });
    setForm({
      type: 'couronne',
      libelle: '',
      laboratoire: '',
      dents: '',
      teinte: '',
      materiau: '',
      instructions: '',
      datePrevue: '',
    });
    setOuvert(false);
  };

  const avancer = (ordre: OrdreLab) => {
    const suite: Record<StatutOrdreLab, StatutOrdreLab | null> = {
      brouillon: 'envoye',
      envoye: 'en_fabrication',
      en_fabrication: 'recu',
      recu: 'essaye',
      essaye: 'pose',
      pose: null,
      annule: null,
    };
    const prochain = suite[ordre.statut];
    if (!prochain) return;
    const patch: Partial<OrdreLab> = { statut: prochain };
    if (prochain === 'envoye') patch.dateEnvoi = maintenant().slice(0, 10);
    if (prochain === 'recu') patch.dateReception = maintenant().slice(0, 10);
    majOrdreLab(ordre.id, patch);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Ordres de laboratoire</h3>
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
        >
          {ouvert ? 'Fermer' : 'Nouvel ordre'}
        </button>
      </div>

      {ouvert && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TypeOrdreLab }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Libellé *</span>
              <input
                value={form.libelle}
                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                placeholder="Couronne zircone 26"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Laboratoire</span>
              <input
                value={form.laboratoire}
                onChange={(e) => setForm((f) => ({ ...f, laboratoire: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Dents (ex. 26 27)</span>
              <input
                value={form.dents}
                onChange={(e) => setForm((f) => ({ ...f, dents: e.target.value }))}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Teinte</span>
              <input
                value={form.teinte}
                onChange={(e) => setForm((f) => ({ ...f, teinte: e.target.value }))}
                placeholder="A2"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-slate-600">Matériau</span>
              <input
                value={form.materiau}
                onChange={(e) => setForm((f) => ({ ...f, materiau: e.target.value }))}
                placeholder="Zircone, disilicate…"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs col-span-2">
              <span className="mb-1 block text-slate-600">Instructions</span>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                rows={2}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={creer}
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {ordres.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun ordre de laboratoire pour ce patient.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {ordres.map((o) => {
            const st = STATUTS.find((s) => s.id === o.statut)!;
            return (
              <li key={o.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{o.libelle}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.couleur}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {TYPES.find((t) => t.id === o.type)?.label}
                    {o.dents.length > 0 && ` · Dents ${o.dents.join(', ')}`}
                    {o.teinte && ` · Teinte ${o.teinte}`}
                    {o.laboratoire && ` · ${o.laboratoire}`}
                  </p>
                  {o.instructions && <p className="mt-1 text-xs text-slate-600">{o.instructions}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {o.statut !== 'pose' && o.statut !== 'annule' && (
                    <button
                      type="button"
                      onClick={() => avancer(o)}
                      className="rounded px-2 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-50"
                      title="Passer à l’étape suivante"
                    >
                      Avancer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Supprimer cet ordre de laboratoire ?')) supprimerOrdreLab(o.id);
                    }}
                    className="rounded px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                  >
                    Suppr.
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
