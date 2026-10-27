import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CycleSterilisation, TypeSterilisateur } from '@/types';
import { useApp } from '@/store/AppContext';
import {
  LIBELLE_STATUT,
  LIBELLE_STERILISATEUR,
  REPERES,
  TYPES_STERILISATEUR,
  bilan,
  cycleUtilisable,
  ecartAuxReperes,
  motifNonConformite,
  numeroDejaPris,
  rappelsAvecPatients,
  statutCycle,
} from '@/data/sterilisation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, type TonBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { formatDateHeure } from '@/lib/utils';

const TON_STATUT: Record<string, TonBadge> = {
  conforme: 'succes',
  non_conforme: 'danger',
  invalide: 'danger',
};

function cycleVide(operateur: string): Omit<CycleSterilisation, 'id'> {
  return {
    numero: '',
    date: new Date().toISOString(),
    sterilisateur: 'Autoclave 1',
    type: 'autoclave_b',
    temperature: REPERES.autoclave_b.temperature,
    dureePalier: REPERES.autoclave_b.duree,
    charge: '',
    indicateurPhysique: true,
    indicateurChimique: true,
    indicateurBiologique: null,
    operateur,
    note: '',
    invalideLe: null,
    motifInvalidation: '',
  };
}

function Bascule({
  label,
  aide,
  valeur,
  onChange,
}: {
  label: string;
  aide?: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3">
      <input
        type="checkbox"
        checked={valeur}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {aide ? <span className="block text-xs text-slate-500">{aide}</span> : null}
      </span>
    </label>
  );
}

export function Sterilisation() {
  const {
    data,
    praticienActif,
    enregistrerCycle,
    invaliderCycle,
    enregistrerUtilisation,
  } = useApp();

  const [nouveau, setNouveau] = useState<Omit<CycleSterilisation, 'id'> | null>(null);
  const [aInvalider, setAInvalider] = useState<CycleSterilisation | null>(null);
  const [motif, setMotif] = useState('');
  const [emploi, setEmploi] = useState<{ cycleId: string; patientId: string; acte: string } | null>(null);

  /* Le magasin ne publie pas de résolveur de nom : on le dérive ici. */
  const nomPatient = (id: string) => {
    const p = data.patients.find((x) => x.id === id);
    return p ? `${p.prenom} ${p.nom}` : 'Patient inconnu';
  };

  const cycles = useMemo(
    () => [...data.cycles].sort((a, b) => b.date.localeCompare(a.date)),
    [data.cycles],
  );
  const rappels = useMemo(
    () => rappelsAvecPatients(data.cycles, data.utilisationsCycle),
    [data.cycles, data.utilisationsCycle],
  );
  const chiffres = bilan(data.cycles, data.utilisationsCycle);
  const cyclesUtilisables = cycles.filter(cycleUtilisable);

  const numeroEnDouble = nouveau ? numeroDejaPris(data.cycles, nouveau.numero) : false;

  return (
    <div className="space-y-5">
      {/*
       * L'alerte passe avant tout le reste. Le registre est une obligation ;
       * savoir qui rappeler est l'urgence.
       */}
      {rappels.length ? (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4">
          <h2 className="text-base font-semibold text-red-900">
            {chiffres.patientsARappeler} patient(s) à rappeler
          </h2>
          <p className="mt-1 text-sm text-red-800">
            Des instruments issus de {rappels.length} cycle(s) non conforme(s) ont été employés.
          </p>
          <div className="mt-3 space-y-3">
            {rappels.map((r) => (
              <div key={r.cycle.id} className="rounded-lg border border-red-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">
                  Cycle n° {r.cycle.numero} · {formatDateHeure(r.cycle.date)}
                </p>
                <p className="mt-0.5 text-sm text-red-800">{r.motif}</p>
                <ul className="mt-2 space-y-1">
                  {r.utilisations.map((u) => (
                    <li key={u.id} className="text-sm">
                      <Link
                        to={`/patients/${u.patientId}`}
                        className="font-medium text-brand-700 underline underline-offset-2"
                      >
                        {nomPatient(u.patientId)}
                      </Link>
                      <span className="text-slate-600">
                        {' '}
                        · {formatDateHeure(u.date)}
                        {u.acte ? ` · ${u.acte}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader
          titre="Stérilisation"
          sousTitre="Registre des cycles et traçabilité vers les dossiers patients"
          action={
            <>
              <Button
                variante="secondaire"
                disabled={cyclesUtilisables.length === 0}
                onClick={() =>
                  setEmploi({ cycleId: cyclesUtilisables[0]?.id ?? '', patientId: '', acte: '' })
                }
              >
                + Emploi d’une charge
              </Button>
              <Button onClick={() => setNouveau(cycleVide(praticienActif))}>+ Cycle</Button>
            </>
          }
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cycles</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{chiffres.total}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conformes</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{chiffres.conformes}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Taux</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {chiffres.tauxConformite === null ? '—' : `${chiffres.tauxConformite} %`}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">À traiter</p>
              <p
                className={
                  chiffres.aTraiter ? 'mt-1 text-lg font-bold text-red-700' : 'mt-1 text-lg font-bold text-slate-900'
                }
              >
                {chiffres.aTraiter}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader titre="Registre" />
        <CardBody>
          {cycles.length === 0 ? (
            <EmptyState
              titre="Aucun cycle enregistré"
              description="Consignez chaque cycle de stérilisation : c'est ce registre qui permet de remonter aux patients si une charge se révèle non conforme."
              action={<Button onClick={() => setNouveau(cycleVide(praticienActif))}>+ Cycle</Button>}
            />
          ) : (
            <div className="space-y-2">
              {cycles.map((c) => {
                const statut = statutCycle(c);
                const emplois = data.utilisationsCycle.filter((u) => u.cycleId === c.id);
                const ecart = ecartAuxReperes(c);
                return (
                  <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">N° {c.numero}</span>
                      <Badge ton={TON_STATUT[statut]}>{LIBELLE_STATUT[statut]}</Badge>
                      <span className="text-sm text-slate-500">{formatDateHeure(c.date)}</span>
                      <span className="ml-auto text-sm text-slate-500">
                        {emplois.length} emploi(s)
                      </span>
                      {statut === 'conforme' ? (
                        <Button
                          taille="sm"
                          variante="fantome"
                          onClick={() => {
                            setAInvalider(c);
                            setMotif('');
                          }}
                        >
                          Invalider
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {LIBELLE_STERILISATEUR[c.type]} · {c.sterilisateur} · {c.temperature} °C ·{' '}
                      {c.dureePalier} min
                    </p>
                    {c.charge ? <p className="text-sm text-slate-600">{c.charge}</p> : null}
                    {statut !== 'conforme' ? (
                      <p className="mt-1 text-sm font-medium text-red-700">{motifNonConformite(c)}</p>
                    ) : null}
                    {ecart ? <p className="mt-1 text-sm text-amber-700">{ecart}</p> : null}
                    <p className="mt-1 text-xs text-slate-400">
                      Indicateurs : enregistrement {c.indicateurPhysique ? 'présent' : 'absent'} ·
                      intégrateur {c.indicateurChimique ? 'conforme' : 'non conforme'} · test biologique{' '}
                      {c.indicateurBiologique === null
                        ? 'non réalisé'
                        : c.indicateurBiologique
                          ? 'négatif'
                          : 'positif'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ------------------------------------------------- Nouveau cycle */}
      {nouveau ? (
        <Modal
          ouvert
          titre="Nouveau cycle de stérilisation"
          onFermer={() => setNouveau(null)}
          largeur="lg"
          pied={
            <>
              <Button variante="secondaire" onClick={() => setNouveau(null)}>
                Annuler
              </Button>
              <Button
                disabled={!nouveau.numero.trim() || numeroEnDouble}
                onClick={() => {
                  enregistrerCycle(nouveau);
                  setNouveau(null);
                }}
              >
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Numéro de cycle"
              aide={numeroEnDouble ? 'Ce numéro est déjà employé.' : 'Celui porté sur les sachets.'}
            >
              <Input
                value={nouveau.numero}
                onChange={(e) => setNouveau({ ...nouveau, numero: e.target.value })}
              />
            </Field>
            <Field label="Stérilisateur">
              <Input
                value={nouveau.sterilisateur}
                onChange={(e) => setNouveau({ ...nouveau, sterilisateur: e.target.value })}
              />
            </Field>
            <Field label="Procédé">
              <Select
                value={nouveau.type}
                onChange={(e) => {
                  const type = e.target.value as TypeSterilisateur;
                  setNouveau({
                    ...nouveau,
                    type,
                    temperature: REPERES[type].temperature,
                    dureePalier: REPERES[type].duree,
                  });
                }}
              >
                {TYPES_STERILISATEUR.map((t) => (
                  <option key={t} value={t}>
                    {LIBELLE_STERILISATEUR[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Opérateur">
              <Input
                value={nouveau.operateur}
                onChange={(e) => setNouveau({ ...nouveau, operateur: e.target.value })}
              />
            </Field>
            <Field label="Température (°C)">
              <Input
                type="number"
                value={nouveau.temperature}
                onChange={(e) => setNouveau({ ...nouveau, temperature: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Palier (minutes)">
              <Input
                type="number"
                value={nouveau.dureePalier}
                onChange={(e) => setNouveau({ ...nouveau, dureePalier: Number(e.target.value) || 0 })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Charge">
                <Input
                  value={nouveau.charge}
                  onChange={(e) => setNouveau({ ...nouveau, charge: e.target.value })}
                  placeholder="Plateaux de soins conservateurs, 8 sachets"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2">
              <Bascule
                label="Enregistrement du cycle"
                aide="Diagramme ou ticket de l’appareil."
                valeur={nouveau.indicateurPhysique}
                onChange={(v) => setNouveau({ ...nouveau, indicateurPhysique: v })}
              />
              <Bascule
                label="Intégrateur chimique"
                aide="Viré dans la charge."
                valeur={nouveau.indicateurChimique}
                onChange={(v) => setNouveau({ ...nouveau, indicateurChimique: v })}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Test biologique"
                aide="Le résultat arrive souvent 24 à 48 h plus tard : laissez « non réalisé » puis invalidez le cycle s’il revient positif."
              >
                <Select
                  value={
                    nouveau.indicateurBiologique === null ? '' : nouveau.indicateurBiologique ? 'ok' : 'ko'
                  }
                  onChange={(e) =>
                    setNouveau({
                      ...nouveau,
                      indicateurBiologique: e.target.value === '' ? null : e.target.value === 'ok',
                    })
                  }
                >
                  <option value="">Non réalisé sur ce cycle</option>
                  <option value="ok">Négatif</option>
                  <option value="ko">Positif</option>
                </Select>
              </Field>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* --------------------------------------------------- Invalidation */}
      {aInvalider ? (
        <Modal
          ouvert
          titre={`Invalider le cycle n° ${aInvalider.numero}`}
          onFermer={() => setAInvalider(null)}
          pied={
            <>
              <Button variante="secondaire" onClick={() => setAInvalider(null)}>
                Annuler
              </Button>
              <Button
                variante="danger"
                disabled={!motif.trim()}
                onClick={() => {
                  invaliderCycle(aInvalider.id, motif.trim());
                  setAInvalider(null);
                }}
              >
                Invalider
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {(() => {
                const n = new Set(
                  data.utilisationsCycle.filter((u) => u.cycleId === aInvalider.id).map((u) => u.patientId),
                ).size;
                return n
                  ? `${n} dossier(s) patient ont reçu des instruments de ce cycle. L’invalidation sera inscrite dans chacun d’eux.`
                  : 'Aucune charge de ce cycle n’a encore été employée sur un patient.';
              })()}
            </p>
            <Field label="Motif" aide="Inscrit au dossier des patients concernés.">
              <Input
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Test de spores positif reçu le surlendemain."
              />
            </Field>
          </div>
        </Modal>
      ) : null}

      {/* ------------------------------------------------ Emploi d'une charge */}
      {emploi ? (
        <Modal
          ouvert
          titre="Emploi d’une charge stérilisée"
          onFermer={() => setEmploi(null)}
          pied={
            <>
              <Button variante="secondaire" onClick={() => setEmploi(null)}>
                Annuler
              </Button>
              <Button
                disabled={!emploi.cycleId || !emploi.patientId}
                onClick={() => {
                  enregistrerUtilisation({ ...emploi, date: new Date().toISOString() });
                  setEmploi(null);
                }}
              >
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="grid gap-3">
            <Field label="Cycle">
              <Select
                value={emploi.cycleId}
                onChange={(e) => setEmploi({ ...emploi, cycleId: e.target.value })}
              >
                {cyclesUtilisables.map((c) => (
                  <option key={c.id} value={c.id}>
                    N° {c.numero} · {formatDateHeure(c.date)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Patient">
              <Select
                value={emploi.patientId}
                onChange={(e) => setEmploi({ ...emploi, patientId: e.target.value })}
              >
                <option value="">Choisir un patient</option>
                {data.patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.prenom} {p.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Acte">
              <Input
                value={emploi.acte}
                onChange={(e) => setEmploi({ ...emploi, acte: e.target.value })}
                placeholder="Composite 36"
              />
            </Field>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
