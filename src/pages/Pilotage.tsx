import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { GrapheProduction } from '@/components/GrapheProduction';
import { RdvForm } from '@/components/RdvForm';
import type { BrouillonRdv } from '@/components/RdvForm';
import {
  actesNonFactures,
  chargeParPraticien,
  patientsARappeler,
  repartitionActes,
  santeFinanciere,
  serieMensuelle,
  statistiquesRdv,
  tauxAcceptationDevis,
} from '@/lib/pilotage';
import { cx, formatDate, formatMontant } from '@/lib/utils';

function Kpi({
  label,
  valeur,
  detail,
  ton = 'neutre',
}: {
  label: string;
  valeur: string;
  detail?: string;
  ton?: 'neutre' | 'bon' | 'moyen' | 'mauvais';
}) {
  const couleur = {
    neutre: 'text-slate-900',
    bon: 'text-emerald-700',
    moyen: 'text-amber-700',
    mauvais: 'text-rose-700',
  }[ton];
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx('mt-1 text-2xl font-bold', couleur)}>{valeur}</p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
    </Card>
  );
}

export function Pilotage() {
  const { data, ajouterRdv, majPatient } = useApp();
  const devise = data.cabinet.devise;
  const [fenetre, setFenetre] = useState(6);
  const [rdvPour, setRdvPour] = useState<string | null>(null);

  const maintenant = new Date();
  const depuis = useMemo(() => {
    const d = new Date(maintenant);
    d.setMonth(d.getMonth() - fenetre);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fenetre]);

  const serie = useMemo(() => serieMensuelle(data, fenetre, maintenant), [data, fenetre, maintenant]);
  const finance = useMemo(() => santeFinanciere(data, maintenant), [data, maintenant]);
  const devis = useMemo(() => tauxAcceptationDevis(data), [data]);
  const rdv = useMemo(() => statistiquesRdv(data, depuis, maintenant), [data, depuis, maintenant]);
  const charge = useMemo(
    () => chargeParPraticien(data, depuis, maintenant),
    [data, depuis, maintenant],
  );
  const actes = useMemo(() => repartitionActes(data), [data]);
  const oublies = useMemo(() => actesNonFactures(data), [data]);
  const rappels = useMemo(() => patientsARappeler(data, maintenant), [data, maintenant]);

  const maxCharge = Math.max(1, ...charge.map((c) => c.minutes));
  const maxActes = Math.max(1, ...actes.map((a) => a.montant));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pilotage du cabinet</h1>
          <p className="text-sm text-slate-500">
            Indicateurs calculés sur les {fenetre} derniers mois, à partir des données réelles du dossier.
          </p>
        </div>
        <Select
          value={fenetre}
          onChange={(e) => setFenetre(Number(e.target.value))}
          className="w-44"
          aria-label="Période d’analyse"
        >
          <option value={3}>3 derniers mois</option>
          <option value={6}>6 derniers mois</option>
          <option value={12}>12 derniers mois</option>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Encaissé"
          valeur={formatMontant(
            serie.reduce((s, p) => s + p.encaisse, 0),
            devise,
          )}
          detail={`sur ${fenetre} mois`}
          ton="bon"
        />
        <Kpi
          label="Taux de recouvrement"
          valeur={`${finance.tauxRecouvrement} %`}
          detail={`${formatMontant(finance.resteDu, devise)} en attente`}
          ton={finance.tauxRecouvrement >= 90 ? 'bon' : finance.tauxRecouvrement >= 70 ? 'moyen' : 'mauvais'}
        />
        <Kpi
          label="Acceptation des devis"
          valeur={devis.presentes === 0 ? '—' : `${devis.taux} %`}
          detail={
            devis.presentes === 0
              ? 'Aucun devis présenté'
              : `${devis.acceptes} accepté(s), ${devis.enAttente} en attente`
          }
          ton={devis.taux >= 60 ? 'bon' : devis.taux >= 35 ? 'moyen' : 'mauvais'}
        />
        <Kpi
          label="Rendez-vous non honorés"
          valeur={`${rdv.tauxAbsenteisme} %`}
          detail={`${rdv.absents} absence(s) sur ${rdv.total} rendez-vous`}
          ton={rdv.tauxAbsenteisme <= 5 ? 'bon' : rdv.tauxAbsenteisme <= 12 ? 'moyen' : 'mauvais'}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader titre="Production" sousTitre="Facturé et encaissé, mois par mois" />
          <CardBody>
            <GrapheProduction points={serie} devise={devise} />
            {finance.retardLong > 0 ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {formatMontant(finance.retardLong, devise)} dus depuis plus de 60 jours.{' '}
                <Link to="/facturation" className="font-semibold underline">
                  Voir les factures
                </Link>
              </p>
            ) : null}
            {oublies.nombre > 0 ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {oublies.nombre} acte(s) réalisé(s) jamais facturé(s), soit{' '}
                {formatMontant(oublies.montant, devise)} de chiffre d’affaires oublié.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Charge par praticien" sousTitre={`Sur ${fenetre} mois`} />
          <CardBody className="space-y-3">
            {charge.map((c) => (
              <div key={c.praticien}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-slate-700">{c.praticien}</span>
                  <span className="text-slate-500">
                    {Math.round(c.minutes / 60)} h · {c.rendezVous} RDV
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.max(2, (c.minutes / maxCharge) * 100)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{c.occupation} % du temps ouvrable</p>
              </div>
            ))}
            {charge.length === 0 ? <p className="text-sm text-slate-400">Aucun praticien enregistré.</p> : null}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            titre="Rappels à passer"
            sousTitre={(() => {
              const aAppeler = rappels.filter((r) => !r.rdvProgramme).length;
              const reprogrammes = rappels.length - aAppeler;
              if (rappels.length === 0) return 'Tous les contrôles sont à jour';
              return `${aAppeler} à recontacter${reprogrammes > 0 ? ` · ${reprogrammes} déjà reprogrammé(s)` : ''}`;
            })()}
          />
          {rappels.length === 0 ? (
            <EmptyState titre="Aucun rappel en attente" description="Tous les contrôles sont à jour." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rappels.slice(0, 10).map((r) => (
                <li key={r.patient.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <Link
                      to={`/patients/${r.patient.id}`}
                      className="font-medium text-slate-800 hover:text-brand-700"
                    >
                      {r.patient.prenom} {r.patient.nom}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      Contrôle attendu le {formatDate(r.echeance)} · {r.joursDeRetard} jours de retard ·{' '}
                      {r.patient.telephone}
                    </span>
                  </span>
                  {r.rdvProgramme ? (
                    <Badge ton="succes">Déjà reprogrammé</Badge>
                  ) : (
                    <>
                      <Button taille="sm" onClick={() => setRdvPour(r.patient.id)}>
                        Planifier
                      </Button>
                      <Button
                        taille="sm"
                        variante="secondaire"
                        onClick={() =>
                          majPatient(r.patient.id, { dernierControle: new Date().toISOString().slice(0, 10) })
                        }
                      >
                        Reporter
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader titre="Répartition des actes réalisés" sousTitre="Par catégorie, en honoraires" />
          {actes.length === 0 ? (
            <EmptyState titre="Aucun acte réalisé" />
          ) : (
            <CardBody className="space-y-2.5">
              {actes.map((a) => (
                <div key={a.categorie}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-slate-700">{a.categorie}</span>
                    <span className="text-slate-600">
                      {formatMontant(a.montant, devise)}
                      <span className="ml-2 text-xs text-slate-400">{a.nombre} acte(s)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-600"
                      style={{ width: `${Math.max(2, (a.montant / maxActes) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardBody>
          )}
        </Card>
      </div>

      <RdvForm
        ouvert={rdvPour !== null}
        patientIdImpose={rdvPour ?? undefined}
        onFermer={() => setRdvPour(null)}
        onEnregistrer={(b: BrouillonRdv) => {
          ajouterRdv(b);
          setRdvPour(null);
        }}
      />
    </div>
  );
}
