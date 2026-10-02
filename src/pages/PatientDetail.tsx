import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Acte, EtatDent, Face, NoteClinique } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { DentalChart, LegendeEtats } from '@/components/DentalChart';
import { OdontogrammeArcade } from '@/components/OdontogrammeArcade';
import { ToothPanel } from '@/components/ToothPanel';
import { PatientForm } from '@/components/PatientForm';
import { OngletParodontie } from '@/components/perio/OngletParodontie';
import { PanneauAlertes } from '@/components/PanneauAlertes';
import { PanneauRisques } from '@/components/PanneauRisques';
import { biographieDent, datesClesSchema, odontogrammeADate } from '@/lib/historique';
import {
  evaluerAlertes,
  evaluerRisqueCarieux,
  evaluerRisqueParodontal,
  intervalleRappelConseille,
} from '@/lib/decision';
import { ActeForm } from '@/components/ActeForm';
import type { BrouillonActe } from '@/components/ActeForm';
import { RdvForm } from '@/components/RdvForm';
import type { BrouillonRdv } from '@/components/RdvForm';
import { STATUT_RDV_META } from '@/pages/Agenda';
import { ETATS } from '@/data/teeth';
import { resumerActes, resteAPayer, totalFacture, totalPaye } from '@/lib/finance';
import {
  age,
  cx,
  formatDate,
  formatDateHeure,
  formatHeure,
  formatMontant,
  initiales,
  maintenant,
} from '@/lib/utils';

type Onglet = 'schema' | 'parodontie' | 'traitements' | 'agenda' | 'notes' | 'facturation' | 'dossier';

const ONGLETS: Array<{ cle: Onglet; label: string }> = [
  { cle: 'schema', label: 'Schéma dentaire' },
  { cle: 'parodontie', label: 'Parodontie' },
  { cle: 'traitements', label: 'Plan de traitement' },
  { cle: 'agenda', label: 'Rendez-vous' },
  { cle: 'notes', label: 'Notes cliniques' },
  { cle: 'facturation', label: 'Facturation' },
  { cle: 'dossier', label: 'Dossier médical' },
];

const STATUT_ACTE_META: Record<Acte['statut'], { libelle: string; ton: 'neutre' | 'violet' | 'succes' | 'danger' }> = {
  planifie: { libelle: 'Planifié', ton: 'neutre' },
  en_cours: { libelle: 'En cours', ton: 'violet' },
  realise: { libelle: 'Réalisé', ton: 'succes' },
  annule: { libelle: 'Annulé', ton: 'danger' },
};

export function PatientDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const {
    data,
    majPatient,
    supprimerPatient,
    odontogramme,
    majDent,
    reinitialiserDent,
    changerDentition,
    ajouterActe,
    majActe,
    supprimerActe,
    ajouterRdv,
    majRdv,
    supprimerRdv,
    ajouterNote,
    supprimerNote,
    facturerActes,
  } = useApp();

  const patient = data.patients.find((p) => p.id === id);
  const [onglet, setOnglet] = useState<Onglet>('schema');
  const [selection, setSelection] = useState<number[]>([]);
  const [pinceau, setPinceau] = useState<EtatDent | null>(null);
  const [vueSchema, setVueSchema] = useState<'arcade' | 'grille'>('arcade');
  /** Index dans les dates clés ; null = état courant. */
  const [instant, setInstant] = useState<number | null>(null);
  const [editionPatient, setEditionPatient] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [acteForm, setActeForm] = useState<{ ouvert: boolean; acte?: Acte }>({ ouvert: false });
  const [rdvForm, setRdvForm] = useState<{ ouvert: boolean; rdvId?: string }>({ ouvert: false });
  const [noteForm, setNoteForm] = useState(false);
  const [brouillonNote, setBrouillonNote] = useState<Omit<NoteClinique, 'id'> | null>(null);
  const [selectionFacture, setSelectionFacture] = useState<string[]>([]);

  const odonto = odontogramme(id);
  const etatsParDent = useMemo(
    () => Object.fromEntries(odonto.dents.map((d) => [d.numero, d])) as Record<number, (typeof odonto.dents)[number]>,
    [odonto.dents],
  );

  const actesPatient = useMemo(
    () =>
      data.actes
        .filter((a) => a.patientId === id)
        .sort((a, b) => a.seance - b.seance || a.datePrevue.localeCompare(b.datePrevue)),
    [data.actes, id],
  );
  const rdvPatient = useMemo(
    () => data.rendezVous.filter((r) => r.patientId === id).sort((a, b) => b.debut.localeCompare(a.debut)),
    [data.rendezVous, id],
  );
  const notesPatient = useMemo(
    () => data.notes.filter((n) => n.patientId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [data.notes, id],
  );
  const facturesPatient = useMemo(
    () => data.factures.filter((f) => f.patientId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [data.factures, id],
  );

  const resume = useMemo(() => resumerActes(actesPatient), [actesPatient]);

  const datesCles = useMemo(() => datesClesSchema(data.journal, id), [data.journal, id]);

  /** Schéma rejoué à la date choisie, ou état courant. */
  const etatsAffiches = useMemo(() => {
    if (instant === null || !datesCles[instant]) return etatsParDent;
    return odontogrammeADate(data.journal, id, datesCles[instant]);
  }, [instant, datesCles, data.journal, id, etatsParDent]);

  const remontee = instant !== null && !!datesCles[instant];

  const dernierCharting = useMemo(
    () =>
      data.chartingsParo
        .filter((c) => c.patientId === id)
        .sort((a, b) => b.date.localeCompare(a.date))[0],
    [data.chartingsParo, id],
  );

  const alertes = useMemo(
    () =>
      patient
        ? evaluerAlertes({ patient, actes: actesPatient, dents: odonto.dents, charting: dernierCharting })
        : [],
    [patient, actesPatient, odonto.dents, dernierCharting],
  );

  const risqueCarieux = useMemo(
    () => (patient ? evaluerRisqueCarieux(patient, odonto.dents) : null),
    [patient, odonto.dents],
  );
  const risqueParo = useMemo(
    () => (patient ? evaluerRisqueParodontal(patient, dernierCharting, odonto.dents) : null),
    [patient, dernierCharting, odonto.dents],
  );
  const soldeDu = facturesPatient.reduce((s, f) => s + (f.statut === 'annulee' ? 0 : resteAPayer(f)), 0);

  if (!patient) {
    return (
      <Card>
        <EmptyState
          titre="Patient introuvable"
          description="Ce dossier a peut-être été supprimé."
          action={<Button onClick={() => navigate('/patients')}>Retour à la liste</Button>}
        />
      </Card>
    );
  }

  const derniereDent = selection[selection.length - 1];
  const dentsAvecAnomalie = odonto.dents.filter((d) => d.etat !== 'saine');

  const basculerSelection = (numero: number, evenement: { ctrl: boolean }) => {
    setSelection((s) => {
      if (evenement.ctrl) return s.includes(numero) ? s.filter((n) => n !== numero) : [...s, numero];
      return s.length === 1 && s[0] === numero ? [] : [numero];
    });
  };

  const peindreFace = (numero: number, face: Face) => {
    if (!pinceau) return;
    const courant = etatsParDent[numero];
    const dejaMarquee = courant?.faces.includes(face) && courant.etat === pinceau;
    const faces = dejaMarquee
      ? (courant?.faces ?? []).filter((f) => f !== face)
      : Array.from(new Set([...(courant?.etat === pinceau ? (courant?.faces ?? []) : []), face]));
    majDent(id, numero, { etat: faces.length === 0 && dejaMarquee ? 'saine' : pinceau, faces });
    setSelection([numero]);
  };

  const enregistrerActe = (b: BrouillonActe) => {
    if (acteForm.acte) majActe(acteForm.acte.id, b);
    else ajouterActe(b);
    setActeForm({ ouvert: false });
  };

  const enregistrerRdv = (b: BrouillonRdv) => {
    if (rdvForm.rdvId) majRdv(rdvForm.rdvId, b);
    else ajouterRdv(b);
    setRdvForm({ ouvert: false });
  };

  const ouvrirNote = () => {
    setBrouillonNote({
      patientId: id,
      date: maintenant(),
      auteur: data.cabinet.praticiens[0]?.nom ?? '',
      categorie: 'consultation',
      contenu: '',
      dents: selection,
    });
    setNoteForm(true);
  };

  const facturer = () => {
    const facture = facturerActes(id, selectionFacture);
    setSelectionFacture([]);
    if (facture) {
      setOnglet('facturation');
    }
  };

  const acteAFacturer = actesPatient.filter(
    (a) => a.statut === 'realise' && !facturesPatient.some((f) => f.lignes.some((l) => l.acteId === a.id)),
  );

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/patients" className="hover:text-brand-700">
          Patients
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-700">
          {patient.prenom} {patient.nom}
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
            {initiales(patient.prenom, patient.nom)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {patient.prenom} {patient.nom}
              </h1>
              {!patient.actif ? <Badge ton="neutre">Dossier inactif</Badge> : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {age(patient.dateNaissance)} ans · née le {formatDate(patient.dateNaissance)} ·{' '}
              {patient.sexe === 'F' ? 'Féminin' : patient.sexe === 'M' ? 'Masculin' : 'Autre'}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <span>{patient.telephone}</span>
              {patient.email ? <span>{patient.email}</span> : null}
              {patient.mutuelle ? <span>Mutuelle : {patient.mutuelle}</span> : null}
              {patient.numeroSecu ? <span>N° SS : {patient.numeroSecu}</span> : null}
            </div>
            {patient.allergies.length > 0 || patient.alertes.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {patient.allergies.map((a) => (
                  <Badge key={a} ton="danger">
                    ⚠ Allergie : {a}
                  </Badge>
                ))}
                {patient.alertes.map((a) => (
                  <Badge key={a} ton="alerte">
                    ⚠ {a}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button variante="secondaire" onClick={() => setRdvForm({ ouvert: true })}>
              Planifier un RDV
            </Button>
            <Button variante="secondaire" onClick={() => setEditionPatient(true)}>
              Modifier
            </Button>
            <Button variante="secondaire" onClick={() => window.print()}>
              Imprimer
            </Button>
            <Button variante="fantome" onClick={() => setSuppression(true)}>
              Supprimer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
          {[
            { label: 'Dents à surveiller', valeur: String(dentsAvecAnomalie.length) },
            { label: 'Actes planifiés', valeur: String(resume.parStatut.planifie + resume.parStatut.en_cours) },
            { label: 'Plan de traitement', valeur: formatMontant(resume.total, data.cabinet.devise) },
            { label: 'Solde dû', valeur: formatMontant(soldeDu, data.cabinet.devise) },
          ].map((s) => (
            <div key={s.label} className="bg-white px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{s.valeur}</p>
            </div>
          ))}
        </div>
      </Card>

      {alertes.length > 0 ? (
        <section aria-label="Points de vigilance">
          <PanneauAlertes
            alertes={alertes}
            onDents={(d) => {
              setSelection(d);
              setOnglet('schema');
            }}
          />
        </section>
      ) : null}

      <div className="no-print flex flex-wrap gap-1 border-b border-slate-200">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            className={cx(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
              onglet === o.cle
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'schema' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader
              titre="Schéma dentaire"
              sousTitre="Cliquez une dent pour la sélectionner, ou choisissez un état pour peindre les faces."
              action={
                <>
                  <div className="flex overflow-hidden rounded-lg border border-slate-300">
                    {(
                      [
                        ['arcade', 'Arcade'],
                        ['grille', 'Grille'],
                      ] as const
                    ).map(([cle, label]) => (
                      <button
                        key={cle}
                        type="button"
                        onClick={() => setVueSchema(cle)}
                        className={cx(
                          'px-3 py-1.5 text-xs font-semibold',
                          vueSchema === cle
                            ? 'bg-brand-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Select
                    value={odonto.dentition}
                    onChange={(e) => changerDentition(id, e.target.value as 'permanente' | 'temporaire')}
                    className="w-52"
                    aria-label="Type de dentition"
                  >
                    <option value="permanente">Dentition permanente</option>
                    <option value="temporaire">Dentition temporaire</option>
                  </Select>
                </>
              }
            />
            <CardBody>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <LegendeEtats pinceau={pinceau} onPinceau={setPinceau} />
              </div>
              {datesCles.length > 1 ? (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                        checked={remontee}
                        onChange={(e) => setInstant(e.target.checked ? datesCles.length - 1 : null)}
                      />
                      Remonter le temps
                    </label>
                    {remontee ? (
                      <>
                        <input
                          type="range"
                          min={0}
                          max={datesCles.length - 1}
                          value={instant ?? datesCles.length - 1}
                          onChange={(e) => setInstant(Number(e.target.value))}
                          aria-label="Date du schéma dentaire"
                          className="h-1.5 flex-1 min-w-[180px] cursor-pointer accent-brand-600"
                        />
                        <span className="text-sm font-semibold text-brand-800">
                          {formatDate(datesCles[instant ?? 0])}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {datesCles.length} modifications tracées depuis l’ouverture du dossier.
                      </span>
                    )}
                  </div>
                  {remontee ? (
                    <p className="mt-1.5 text-xs text-brand-800">
                      Schéma reconstitué à partir du journal : lecture seule. Décochez pour revenir à
                      l’état courant.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {pinceau ? (
                <p className="mb-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
                  Mode peinture actif : <strong>{ETATS[pinceau].libelle}</strong>. Cliquez sur une face pour
                  l’appliquer.{' '}
                  <button type="button" className="font-semibold underline" onClick={() => setPinceau(null)}>
                    Quitter
                  </button>
                </p>
              ) : null}

              {vueSchema === 'arcade' ? (
                <OdontogrammeArcade
                  dentition={odonto.dentition}
                  etats={etatsAffiches}
                  selection={selection}
                  onSelectionDent={basculerSelection}
                  pinceau={remontee ? null : pinceau}
                  onPeindreFace={peindreFace}
                  lectureSeule={remontee}
                />
              ) : (
                <DentalChart
                  dentition={odonto.dentition}
                  etats={etatsAffiches}
                  selection={selection}
                  onSelectionDent={basculerSelection}
                  pinceau={remontee ? null : pinceau}
                  onPeindreFace={peindreFace}
                  lectureSeule={remontee}
                />
              )}

              {selection.length > 1 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">
                    {selection.length} dents sélectionnées : {selection.join(', ')}
                  </span>
                  <Button taille="sm" onClick={() => setActeForm({ ouvert: true })}>
                    + Acte groupé
                  </Button>
                  <Button taille="sm" variante="secondaire" onClick={() => setSelection([])}>
                    Effacer
                  </Button>
                </div>
              ) : null}

              <p className="mt-3 text-xs text-slate-400">
                Astuce : Ctrl/⌘ + clic pour sélectionner plusieurs dents. Un point noir signale une note.
              </p>
            </CardBody>
          </Card>

          <Card className="self-start">
            <CardHeader titre={derniereDent ? `Dent ${derniereDent}` : 'Détail de la dent'} />
            <CardBody>
              {derniereDent ? (
                <ToothPanel
                  numero={derniereDent}
                  etat={etatsParDent[derniereDent]}
                  actes={actesPatient.filter((a) => a.dents.includes(derniereDent))}
                  biographie={biographieDent(data.journal, id, derniereDent)}
                  onChangerEtat={(e) => majDent(id, derniereDent, { etat: e })}
                  onBasculerFace={(f) => {
                    const courant = etatsParDent[derniereDent];
                    const faces = courant?.faces ?? [];
                    majDent(id, derniereDent, {
                      faces: faces.includes(f) ? faces.filter((x) => x !== f) : [...faces, f],
                      etat: courant?.etat === 'saine' || !courant ? 'carie' : courant.etat,
                    });
                  }}
                  onNote={(note) => majDent(id, derniereDent, { note })}
                  onReinitialiser={() => reinitialiserDent(id, derniereDent)}
                  onAjouterActe={() => setActeForm({ ouvert: true })}
                />
              ) : (
                <EmptyState
                  titre="Aucune dent sélectionnée"
                  description="Cliquez sur une dent du schéma pour saisir son état, ses faces atteintes et ses actes."
                />
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {onglet === 'parodontie' ? <OngletParodontie patient={patient} /> : null}

      {onglet === 'traitements' ? (
        <Card>
          <CardHeader
            titre="Plan de traitement"
            sousTitre={`${actesPatient.length} acte(s) · reste à charge estimé ${formatMontant(resume.resteACharge, data.cabinet.devise)}`}
            action={
              <>
                {acteAFacturer.length > 0 ? (
                  <Button
                    variante="secondaire"
                    onClick={() => setSelectionFacture(acteAFacturer.map((a) => a.id))}
                  >
                    Sélectionner les actes à facturer ({acteAFacturer.length})
                  </Button>
                ) : null}
                <Button onClick={() => setActeForm({ ouvert: true })}>+ Ajouter un acte</Button>
              </>
            }
          />
          {selectionFacture.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-brand-50 px-5 py-3 text-sm">
              <span className="font-medium text-brand-900">
                {selectionFacture.length} acte(s) sélectionné(s) —{' '}
                {formatMontant(
                  actesPatient.filter((a) => selectionFacture.includes(a.id)).reduce((s, a) => s + a.tarif, 0),
                  data.cabinet.devise,
                )}
              </span>
              <Button taille="sm" onClick={facturer}>
                Créer la facture
              </Button>
              <Button taille="sm" variante="secondaire" onClick={() => setSelectionFacture([])}>
                Annuler
              </Button>
            </div>
          ) : null}

          {actesPatient.length === 0 ? (
            <EmptyState
              titre="Aucun acte planifié"
              description="Ajoutez les soins prévus pour construire le devis du patient."
              action={<Button onClick={() => setActeForm({ ouvert: true })}>+ Ajouter un acte</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5 font-semibold">Séance</th>
                    <th className="px-3 py-2.5 font-semibold">Acte</th>
                    <th className="px-3 py-2.5 font-semibold">Dents / faces</th>
                    <th className="px-3 py-2.5 font-semibold">Date</th>
                    <th className="px-3 py-2.5 font-semibold">Honoraires</th>
                    <th className="px-3 py-2.5 font-semibold">Statut</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actesPatient.map((a) => (
                    <tr key={a.id} className={cx('hover:bg-slate-50', a.statut === 'annule' && 'opacity-60')}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {acteAFacturer.some((x) => x.id === a.id) ? (
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-slate-300 text-brand-600"
                              checked={selectionFacture.includes(a.id)}
                              onChange={(e) =>
                                setSelectionFacture((s) =>
                                  e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id),
                                )
                              }
                              aria-label={`Facturer ${a.libelle}`}
                            />
                          ) : (
                            <span className="inline-block w-4" />
                          )}
                          <span className="font-semibold text-slate-700">n°{a.seance}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-medium text-slate-800">{a.libelle}</span>
                        <span className="block text-xs text-slate-400">
                          {a.codeActe} · {a.praticien}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {a.dents.length ? a.dents.join(', ') : <span className="text-slate-400">Général</span>}
                        {a.faces.length ? (
                          <span className="block text-xs text-slate-400">{a.faces.join(' / ')}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {formatDate(a.dateRealisation ?? a.datePrevue)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-800">
                          {formatMontant(a.tarif, data.cabinet.devise)}
                        </span>
                        <span className="block text-xs text-slate-400">
                          reste {formatMontant(Math.max(0, a.tarif - a.baseRemboursement), data.cabinet.devise)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge ton={STATUT_ACTE_META[a.statut].ton}>{STATUT_ACTE_META[a.statut].libelle}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {a.statut !== 'realise' ? (
                            <Button
                              taille="sm"
                              variante="succes"
                              onClick={() =>
                                majActe(a.id, {
                                  statut: 'realise',
                                  dateRealisation: new Date().toISOString().slice(0, 10),
                                })
                              }
                            >
                              Marquer réalisé
                            </Button>
                          ) : null}
                          <Button
                            taille="sm"
                            variante="secondaire"
                            onClick={() => setActeForm({ ouvert: true, acte: a })}
                          >
                            Modifier
                          </Button>
                          <Button taille="sm" variante="fantome" onClick={() => supprimerActe(a.id)}>
                            ✕
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
                    <td className="px-5 py-3" colSpan={4}>
                      Total du plan de traitement
                    </td>
                    <td className="px-3 py-3" colSpan={3}>
                      {formatMontant(resume.total, data.cabinet.devise)}
                      <span className="ml-2 font-normal text-slate-500">
                        dont {formatMontant(resume.baseRemboursement, data.cabinet.devise)} remboursables
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {onglet === 'agenda' ? (
        <Card>
          <CardHeader
            titre="Rendez-vous"
            sousTitre={`${rdvPatient.length} rendez-vous enregistrés`}
            action={<Button onClick={() => setRdvForm({ ouvert: true })}>+ Planifier</Button>}
          />
          {rdvPatient.length === 0 ? (
            <EmptyState titre="Aucun rendez-vous" description="Planifiez la prochaine séance du patient." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rdvPatient.map((r) => {
                const meta = STATUT_RDV_META[r.statut];
                const passe = new Date(r.debut) < new Date();
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <span className="w-32 shrink-0">
                      <span className={cx('block text-sm font-semibold', passe ? 'text-slate-500' : 'text-slate-800')}>
                        {formatDate(r.debut)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {formatHeure(r.debut)} · {r.duree} min
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-800">{r.motif}</span>
                      <span className="block text-xs text-slate-500">
                        {r.praticien} · {r.salle}
                        {r.notes ? ` · ${r.notes}` : ''}
                      </span>
                    </span>
                    <Badge ton={meta.ton}>{meta.libelle}</Badge>
                    <Button
                      taille="sm"
                      variante="secondaire"
                      onClick={() => setRdvForm({ ouvert: true, rdvId: r.id })}
                    >
                      Modifier
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}

      {onglet === 'notes' ? (
        <Card>
          <CardHeader
            titre="Notes cliniques"
            sousTitre="Historique chronologique des observations"
            action={<Button onClick={ouvrirNote}>+ Nouvelle note</Button>}
          />
          {notesPatient.length === 0 ? (
            <EmptyState titre="Aucune note" description="Consignez les observations de chaque séance." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {notesPatient.map((n) => (
                <li key={n.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      ton={
                        n.categorie === 'urgence'
                          ? 'danger'
                          : n.categorie === 'soin'
                            ? 'info'
                            : n.categorie === 'controle'
                              ? 'succes'
                              : 'neutre'
                      }
                    >
                      {n.categorie}
                    </Badge>
                    <span className="text-sm font-medium text-slate-700">{formatDateHeure(n.date)}</span>
                    <span className="text-xs text-slate-500">{n.auteur}</span>
                    {n.dents.length ? (
                      <span className="text-xs text-slate-500">Dents : {n.dents.join(', ')}</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => supprimerNote(n.id)}
                      className="no-print ml-auto text-xs text-slate-400 hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{n.contenu}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {onglet === 'facturation' ? (
        <Card>
          <CardHeader
            titre="Factures du patient"
            sousTitre={`Solde dû : ${formatMontant(soldeDu, data.cabinet.devise)}`}
            action={
              <Link to="/facturation" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Module facturation →
              </Link>
            }
          />
          {facturesPatient.length === 0 ? (
            <EmptyState
              titre="Aucune facture"
              description="Marquez des actes comme réalisés puis facturez-les depuis le plan de traitement."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {facturesPatient.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="w-40 shrink-0">
                    <span className="block font-semibold text-slate-800">{f.numero}</span>
                    <span className="block text-xs text-slate-500">{formatDate(f.date)}</span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-slate-600">
                    {f.lignes.map((l) => l.libelle).join(' · ')}
                  </span>
                  <span className="text-right text-sm">
                    <span className="block font-semibold text-slate-800">
                      {formatMontant(totalFacture(f), data.cabinet.devise)}
                    </span>
                    <span className="block text-xs text-emerald-700">
                      payé {formatMontant(totalPaye(f), data.cabinet.devise)}
                    </span>
                  </span>
                  <Badge
                    ton={
                      f.statut === 'payee'
                        ? 'succes'
                        : f.statut === 'partielle'
                          ? 'alerte'
                          : f.statut === 'annulee'
                            ? 'danger'
                            : 'neutre'
                    }
                  >
                    {f.statut}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {onglet === 'dossier' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader titre="Dossier médical" action={<Button variante="secondaire" taille="sm" onClick={() => setEditionPatient(true)}>Modifier</Button>} />
            <CardBody className="space-y-4 text-sm">
              {(
                [
                  ['Allergies', patient.allergies],
                  ['Antécédents', patient.antecedents],
                  ['Traitements en cours', patient.traitementsEnCours],
                  ['Alertes', patient.alertes],
                ] as Array<[string, string[]]>
              ).map(([label, valeurs]) => (
                <div key={label}>
                  <p className="etiquette">{label}</p>
                  {valeurs.length === 0 ? (
                    <p className="text-slate-400">Aucun élément renseigné</p>
                  ) : (
                    <ul className="list-inside list-disc text-slate-700">
                      {valeurs.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              <div>
                <p className="etiquette">Médecin traitant</p>
                <p className="text-slate-700">{patient.medecinTraitant || '—'}</p>
              </div>
              <div>
                <p className="etiquette">Notes administratives</p>
                <p className="whitespace-pre-wrap text-slate-700">{patient.notes || '—'}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader titre="Profil de risque" sousTitre="Calculé à partir du dossier et du dernier sondage" />
            <CardBody>
              {risqueCarieux && risqueParo ? (
                <PanneauRisques
                  carieux={risqueCarieux}
                  parodontal={risqueParo}
                  rappel={intervalleRappelConseille(risqueCarieux, risqueParo)}
                />
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader titre="Synthèse odontologique" sousTitre={`${dentsAvecAnomalie.length} dents avec observation`} />
            <CardBody>
              {dentsAvecAnomalie.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune anomalie enregistrée sur le schéma dentaire.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {[...dentsAvecAnomalie]
                    .sort((a, b) => a.numero - b.numero)
                    .map((d) => (
                      <li key={d.numero} className="flex items-start gap-3 py-2">
                        <span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border text-xs font-bold"
                          style={{
                            background: ETATS[d.etat].couleur,
                            borderColor: ETATS[d.etat].bordure,
                            color: ETATS[d.etat].texte,
                          }}
                        >
                          {d.numero}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800">
                            {ETATS[d.etat].libelle}
                            {d.faces.length ? ` — faces ${d.faces.join('/')}` : ''}
                          </span>
                          {d.note ? <span className="block text-xs text-slate-500">{d.note}</span> : null}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="etiquette">Dossier créé le</p>
                <p className="text-sm text-slate-700">{formatDateHeure(patient.creeLe)}</p>
                <p className="etiquette mt-3">Dernière mise à jour</p>
                <p className="text-sm text-slate-700">{formatDateHeure(patient.majLe)}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <PatientForm
        ouvert={editionPatient}
        patient={patient}
        onFermer={() => setEditionPatient(false)}
        onEnregistrer={(b) => {
          majPatient(patient.id, b);
          setEditionPatient(false);
        }}
      />

      <ActeForm
        ouvert={acteForm.ouvert}
        acte={acteForm.acte}
        patientId={patient.id}
        dentsPreselectionnees={selection}
        onFermer={() => setActeForm({ ouvert: false })}
        onEnregistrer={enregistrerActe}
        onSupprimer={
          acteForm.acte
            ? () => {
                supprimerActe(acteForm.acte!.id);
                setActeForm({ ouvert: false });
              }
            : undefined
        }
      />

      <RdvForm
        ouvert={rdvForm.ouvert}
        rdv={rdvPatient.find((r) => r.id === rdvForm.rdvId)}
        patientIdImpose={patient.id}
        onFermer={() => setRdvForm({ ouvert: false })}
        onEnregistrer={enregistrerRdv}
        onSupprimer={
          rdvForm.rdvId
            ? () => {
                supprimerRdv(rdvForm.rdvId!);
                setRdvForm({ ouvert: false });
              }
            : undefined
        }
      />

      <Modal
        ouvert={noteForm && brouillonNote !== null}
        titre="Nouvelle note clinique"
        onFermer={() => setNoteForm(false)}
        pied={
          <>
            <Button variante="secondaire" onClick={() => setNoteForm(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (brouillonNote && brouillonNote.contenu.trim()) {
                  ajouterNote(brouillonNote);
                  setNoteForm(false);
                }
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        {brouillonNote ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Catégorie">
              <Select
                value={brouillonNote.categorie}
                onChange={(e) =>
                  setBrouillonNote({ ...brouillonNote, categorie: e.target.value as NoteClinique['categorie'] })
                }
              >
                <option value="consultation">Consultation</option>
                <option value="soin">Soin</option>
                <option value="urgence">Urgence</option>
                <option value="controle">Contrôle</option>
                <option value="administratif">Administratif</option>
              </Select>
            </Field>
            <Field label="Praticien">
              <Select
                value={brouillonNote.auteur}
                onChange={(e) => setBrouillonNote({ ...brouillonNote, auteur: e.target.value })}
              >
                {data.cabinet.praticiens.map((p) => (
                  <option key={p.id} value={p.nom}>
                    {p.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dents concernées" className="sm:col-span-2" aide="Numéros FDI séparés par une virgule.">
              <Input
                value={brouillonNote.dents.join(', ')}
                onChange={(e) =>
                  setBrouillonNote({
                    ...brouillonNote,
                    dents: e.target.value
                      .split(',')
                      .map((s) => Number.parseInt(s.trim(), 10))
                      .filter((n) => Number.isFinite(n)),
                  })
                }
              />
            </Field>
            <Field label="Observation" className="sm:col-span-2">
              <Textarea
                rows={5}
                value={brouillonNote.contenu}
                onChange={(e) => setBrouillonNote({ ...brouillonNote, contenu: e.target.value })}
                placeholder="Anamnèse, examen clinique, soins réalisés, conseils…"
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        ouvert={suppression}
        titre="Supprimer le dossier"
        message={`Le dossier de ${patient.prenom} ${patient.nom} et toutes ses données associées seront définitivement supprimés.`}
        onAnnuler={() => setSuppression(false)}
        onConfirmer={() => {
          supprimerPatient(patient.id);
          navigate('/patients');
        }}
      />
    </div>
  );
}
