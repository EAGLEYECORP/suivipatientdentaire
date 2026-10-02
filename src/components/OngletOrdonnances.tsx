import { useMemo, useState } from 'react';
import type { LigneOrdonnance, Ordonnance, Patient } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { MODELES_ORDONNANCE, contreIndication } from '@/data/medicaments';
import { age, aujourdHui, formatDate, uid } from '@/lib/utils';

/** Modèles incompatibles avec les allergies connues du patient. */
function modelesRisques(patient: Patient): Map<string, string> {
  const risques = new Map<string, string>();
  for (const m of MODELES_ORDONNANCE) {
    const allergie = contreIndication(m, patient.allergies);
    if (allergie) risques.set(m.id, allergie);
  }
  return risques;
}

export function OngletOrdonnances({ patient }: { patient: Patient }) {
  const { data, praticienActif, ajouterOrdonnance, supprimerOrdonnance } = useApp();
  const [edition, setEdition] = useState<Omit<Ordonnance, 'id' | 'creeLe'> | null>(null);
  const [impression, setImpression] = useState<string | null>(null);

  const liste = useMemo(
    () => data.ordonnances.filter((o) => o.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date)),
    [data.ordonnances, patient.id],
  );
  const risques = useMemo(() => modelesRisques(patient), [patient]);

  const ouvrir = () =>
    setEdition({
      patientId: patient.id,
      date: aujourdHui(),
      praticien: praticienActif,
      lignes: [{ id: uid('lo'), medicament: '', posologie: '', duree: '', quantite: '1 boîte' }],
      notes: '',
    });

  const appliquerModele = (id: string) => {
    const m = MODELES_ORDONNANCE.find((x) => x.id === id);
    if (!m || !edition) return;
    setEdition({
      ...edition,
      lignes: m.lignes.map((l) => ({ ...l, id: uid('lo') })),
    });
  };

  const majLigne = (id: string, patch: Partial<LigneOrdonnance>) =>
    setEdition((e) =>
      e ? { ...e, lignes: e.lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : e,
    );

  const aImprimer = liste.find((o) => o.id === impression);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          titre="Ordonnances"
          sousTitre={`${liste.length} ordonnance(s) délivrée(s)`}
          action={<Button onClick={ouvrir}>+ Nouvelle ordonnance</Button>}
        />
        {liste.length === 0 ? (
          <EmptyState
            titre="Aucune ordonnance"
            description="Les modèles courants sont pré-remplis et confrontés aux allergies du dossier."
            action={<Button onClick={ouvrir}>+ Nouvelle ordonnance</Button>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {liste.map((o) => (
              <li key={o.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <span className="w-28 shrink-0 text-sm">
                  <span className="block font-semibold text-slate-800">{formatDate(o.date)}</span>
                  <span className="block text-xs text-slate-500">{o.praticien}</span>
                </span>
                <ul className="min-w-0 flex-1 space-y-0.5 text-sm">
                  {o.lignes.map((l) => (
                    <li key={l.id} className="text-slate-700">
                      <span className="font-medium">{l.medicament}</span>
                      <span className="text-slate-500"> — {l.posologie}</span>
                      {l.duree ? <span className="text-slate-400"> · {l.duree}</span> : null}
                    </li>
                  ))}
                </ul>
                <Button taille="sm" variante="secondaire" onClick={() => setImpression(o.id)}>
                  Imprimer
                </Button>
                <Button taille="sm" variante="fantome" onClick={() => supprimerOrdonnance(o.id)}>
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        ouvert={edition !== null}
        titre="Nouvelle ordonnance"
        sousTitre={`${patient.prenom} ${patient.nom} · ${age(patient.dateNaissance)} ans`}
        onFermer={() => setEdition(null)}
        largeur="lg"
        pied={
          <>
            <Button variante="secondaire" onClick={() => setEdition(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (!edition) return;
                const lignes = edition.lignes.filter((l) => l.medicament.trim());
                if (lignes.length === 0) return;
                ajouterOrdonnance({ ...edition, lignes });
                setEdition(null);
              }}
            >
              Délivrer l’ordonnance
            </Button>
          </>
        }
      >
        {edition ? (
          <div className="space-y-4">
            {patient.allergies.length > 0 ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                Allergies au dossier : <strong>{patient.allergies.join(', ')}</strong>
              </p>
            ) : null}

            <Field label="Partir d’un modèle" aide="Les modèles contre-indiqués par une allergie sont signalés.">
              <Select defaultValue="" onChange={(e) => appliquerModele(e.target.value)}>
                <option value="">— Choisir un modèle —</option>
                {MODELES_ORDONNANCE.map((m) => (
                  <option key={m.id} value={m.id} disabled={risques.has(m.id)}>
                    {m.intitule}
                    {risques.has(m.id) ? ` — contre-indiqué (${risques.get(m.id)})` : ` — ${m.indication}`}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="space-y-3">
              {edition.lignes.map((l) => (
                <div key={l.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px_110px_32px]">
                    <Input
                      value={l.medicament}
                      placeholder="Médicament et dosage"
                      aria-label="Médicament"
                      onChange={(e) => majLigne(l.id, { medicament: e.target.value })}
                    />
                    <Input
                      value={l.duree}
                      placeholder="Durée"
                      aria-label="Durée"
                      onChange={(e) => majLigne(l.id, { duree: e.target.value })}
                    />
                    <Input
                      value={l.quantite}
                      placeholder="Quantité"
                      aria-label="Quantité"
                      onChange={(e) => majLigne(l.id, { quantite: e.target.value })}
                    />
                    <Button
                      variante="fantome"
                      aria-label="Supprimer la ligne"
                      onClick={() =>
                        setEdition({ ...edition, lignes: edition.lignes.filter((x) => x.id !== l.id) })
                      }
                    >
                      ✕
                    </Button>
                  </div>
                  <Input
                    className="mt-2"
                    value={l.posologie}
                    placeholder="Posologie"
                    aria-label="Posologie"
                    onChange={(e) => majLigne(l.id, { posologie: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <Button
              variante="secondaire"
              onClick={() =>
                setEdition({
                  ...edition,
                  lignes: [
                    ...edition.lignes,
                    { id: uid('lo'), medicament: '', posologie: '', duree: '', quantite: '1 boîte' },
                  ],
                })
              }
            >
              + Ligne
            </Button>

            <Field label="Remarques">
              <Textarea
                rows={2}
                value={edition.notes}
                onChange={(e) => setEdition({ ...edition, notes: e.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <Modal
        ouvert={aImprimer !== undefined}
        titre="Ordonnance"
        onFermer={() => setImpression(null)}
        largeur="md"
        pied={
          <>
            <Button variante="secondaire" onClick={() => setImpression(null)}>
              Fermer
            </Button>
            <Button onClick={() => window.print()}>Imprimer</Button>
          </>
        }
      >
        {aImprimer ? (
          <article className="space-y-4 text-sm">
            <header className="flex flex-wrap justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <p className="font-semibold text-slate-900">{aImprimer.praticien}</p>
                <p className="text-slate-600">{data.cabinet.nom}</p>
                <p className="text-slate-500">{data.cabinet.adresse}</p>
                <p className="text-slate-500">{data.cabinet.telephone}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">{formatDate(aImprimer.date)}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {patient.prenom} {patient.nom}
                </p>
                <p className="text-slate-500">
                  {age(patient.dateNaissance)} ans · né(e) le {formatDate(patient.dateNaissance)}
                </p>
              </div>
            </header>

            {patient.allergies.length > 0 ? (
              <p className="text-xs text-slate-500">Allergies connues : {patient.allergies.join(', ')}</p>
            ) : null}

            <ol className="space-y-3">
              {aImprimer.lignes.map((l) => (
                <li key={l.id}>
                  <p className="font-semibold text-slate-900">{l.medicament}</p>
                  <p className="text-slate-700">{l.posologie}</p>
                  <p className="text-slate-500">
                    {l.duree}
                    {l.quantite ? ` · ${l.quantite}` : ''}
                  </p>
                </li>
              ))}
            </ol>

            {aImprimer.notes ? <p className="text-slate-600">{aImprimer.notes}</p> : null}

            <footer className="flex items-end justify-between border-t border-slate-200 pt-6">
              <Badge ton="neutre">Ordonnance remise en main propre</Badge>
              <div className="text-right text-xs text-slate-400">
                <p className="mb-8">Signature</p>
                <p>{aImprimer.praticien}</p>
              </div>
            </footer>
          </article>
        ) : null}
      </Modal>
    </div>
  );
}
