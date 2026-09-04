import { useRef, useState } from 'react';
import type { Praticien } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { exporterJSON, importerJSON, telecharger } from '@/lib/storage';
import { uid } from '@/lib/utils';

export function Parametres() {
  const { data, majCabinet, remplacerDonnees, chargerDemo, toutEffacer } = useApp();
  const fichierRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  const [confirmation, setConfirmation] = useState<'effacer' | 'demo' | null>(null);

  const exporter = () => {
    const horodatage = new Date().toISOString().slice(0, 10);
    telecharger(`suivi-patient-dentaire-${horodatage}.json`, exporterJSON(data));
    setMessage({ type: 'ok', texte: 'Sauvegarde exportée.' });
  };

  const importer = async (fichier: File) => {
    try {
      const texte = await fichier.text();
      remplacerDonnees(importerJSON(texte));
      setMessage({ type: 'ok', texte: 'Données importées avec succès.' });
    } catch (e) {
      setMessage({ type: 'erreur', texte: e instanceof Error ? e.message : 'Import impossible.' });
    }
  };

  const majPraticien = (id: string, patch: Partial<Praticien>) =>
    majCabinet({
      praticiens: data.cabinet.praticiens.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500">Cabinet, praticiens et gestion des données.</p>
      </div>

      {message ? (
        <div
          className={
            message.type === 'ok'
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800'
              : 'rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800'
          }
        >
          {message.texte}
        </div>
      ) : null}

      <Card>
        <CardHeader titre="Identité du cabinet" sousTitre="Informations reprises sur les factures." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom du cabinet">
            <Input value={data.cabinet.nom} onChange={(e) => majCabinet({ nom: e.target.value })} />
          </Field>
          <Field label="Téléphone">
            <Input value={data.cabinet.telephone} onChange={(e) => majCabinet({ telephone: e.target.value })} />
          </Field>
          <Field label="Adresse" className="sm:col-span-2">
            <Input value={data.cabinet.adresse} onChange={(e) => majCabinet({ adresse: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <Input value={data.cabinet.email} onChange={(e) => majCabinet({ email: e.target.value })} />
          </Field>
          <Field label="SIRET">
            <Input value={data.cabinet.siret} onChange={(e) => majCabinet({ siret: e.target.value })} />
          </Field>
          <Field label="Devise">
            <Select value={data.cabinet.devise} onChange={(e) => majCabinet({ devise: e.target.value })}>
              <option value="EUR">Euro (€)</option>
              <option value="CHF">Franc suisse (CHF)</option>
              <option value="CAD">Dollar canadien (CAD)</option>
              <option value="MAD">Dirham marocain (MAD)</option>
              <option value="XOF">Franc CFA (XOF)</option>
            </Select>
          </Field>
          <Field label="Durée par défaut d’un rendez-vous (min)">
            <Input
              type="number"
              min={5}
              step={5}
              value={data.cabinet.dureeRdvDefaut}
              onChange={(e) => majCabinet({ dureeRdvDefaut: Math.max(5, Number(e.target.value)) })}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          titre="Praticiens"
          sousTitre={`${data.cabinet.praticiens.length} praticien(s)`}
          action={
            <Button
              taille="sm"
              variante="secondaire"
              onClick={() =>
                majCabinet({
                  praticiens: [
                    ...data.cabinet.praticiens,
                    { id: uid('prat'), nom: 'Nouveau praticien', specialite: 'Omnipratique', couleur: '#64748b' },
                  ],
                })
              }
            >
              + Ajouter
            </Button>
          }
        />
        <CardBody className="space-y-3">
          {data.cabinet.praticiens.map((p) => (
            <div key={p.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_80px_auto]">
              <Input value={p.nom} onChange={(e) => majPraticien(p.id, { nom: e.target.value })} aria-label="Nom" />
              <Input
                value={p.specialite}
                onChange={(e) => majPraticien(p.id, { specialite: e.target.value })}
                aria-label="Spécialité"
              />
              <input
                type="color"
                value={p.couleur}
                onChange={(e) => majPraticien(p.id, { couleur: e.target.value })}
                aria-label="Couleur agenda"
                className="h-10 w-full cursor-pointer rounded-lg border border-slate-300"
              />
              <Button
                variante="fantome"
                onClick={() =>
                  majCabinet({ praticiens: data.cabinet.praticiens.filter((x) => x.id !== p.id) })
                }
                aria-label={`Supprimer ${p.nom}`}
              >
                ✕
              </Button>
            </div>
          ))}
          {data.cabinet.praticiens.length === 0 ? (
            <p className="text-sm text-slate-400">Ajoutez au moins un praticien pour planifier des rendez-vous.</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          titre="Données"
          sousTitre="Les données sont enregistrées localement dans ce navigateur. Exportez-les régulièrement."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ['Patients', data.patients.length],
              ['Actes', data.actes.length],
              ['Rendez-vous', data.rendezVous.length],
              ['Factures', data.factures.length],
            ].map(([label, n]) => (
              <div key={String(label)} className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{n}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variante="secondaire" onClick={exporter}>
              Exporter la sauvegarde (JSON)
            </Button>
            <Button variante="secondaire" onClick={() => fichierRef.current?.click()}>
              Importer une sauvegarde
            </Button>
            <input
              ref={fichierRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importer(f);
                e.target.value = '';
              }}
            />
            <Button variante="secondaire" onClick={() => setConfirmation('demo')}>
              Recharger le jeu de démonstration
            </Button>
            <Button variante="danger" onClick={() => setConfirmation('effacer')}>
              Effacer toutes les données
            </Button>
          </div>

          <p className="text-xs text-slate-400">
            Aucune donnée n’est transmise à un serveur : tout reste sur ce poste. Pour un usage en production
            avec plusieurs postes, branchez le module de stockage sur votre propre API.
          </p>
        </CardBody>
      </Card>

      <ConfirmDialog
        ouvert={confirmation !== null}
        titre={confirmation === 'demo' ? 'Recharger la démonstration' : 'Effacer toutes les données'}
        message={
          confirmation === 'demo'
            ? 'Les données actuelles seront remplacées par le jeu de démonstration.'
            : 'Tous les dossiers, actes, rendez-vous et factures seront définitivement supprimés.'
        }
        libelleConfirmer={confirmation === 'demo' ? 'Recharger' : 'Tout effacer'}
        onAnnuler={() => setConfirmation(null)}
        onConfirmer={() => {
          if (confirmation === 'demo') {
            chargerDemo();
            setMessage({ type: 'ok', texte: 'Jeu de démonstration rechargé.' });
          } else {
            toutEffacer();
            setMessage({ type: 'ok', texte: 'Toutes les données ont été effacées.' });
          }
          setConfirmation(null);
        }}
      />
    </div>
  );
}
