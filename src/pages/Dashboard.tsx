import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RevenueChart } from '@/components/RevenueChart';
import { totalFacture, totalPaye, resteAPayer } from '@/lib/finance';
import { formatMontant, formatHeure, formatDate, memeJour, initiales, age } from '@/lib/utils';
import { STATUT_RDV_META } from '@/pages/Agenda';
import { evaluerAlertes, type Alerte } from '@/lib/decision';

function Tuile({
  label,
  valeur,
  detail,
  accent,
}: {
  label: string;
  valeur: string;
  detail?: string;
  accent?: 'brand' | 'emerald' | 'amber' | 'rose';
}) {
  const couleurs = {
    brand: 'text-brand-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  } as const;
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? couleurs[accent] : 'text-slate-900'}`}>{valeur}</p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </Card>
  );
}

export function Dashboard() {
  const { data } = useApp();
  const devise = data.cabinet.devise;
  const maintenant = new Date();

  const patientsParId = useMemo(
    () => new Map(data.patients.map((p) => [p.id, p])),
    [data.patients],
  );

  const rdvAujourdhui = useMemo(
    () =>
      data.rendezVous
        .filter((r) => memeJour(r.debut, maintenant) && r.statut !== 'annule')
        .sort((a, b) => a.debut.localeCompare(b.debut)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.rendezVous],
  );

  const prochainsRdv = useMemo(
    () =>
      data.rendezVous
        .filter((r) => new Date(r.debut) > maintenant && r.statut !== 'annule')
        .sort((a, b) => a.debut.localeCompare(b.debut))
        .slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.rendezVous],
  );

  const actesPlanifies = data.actes.filter((a) => a.statut === 'planifie' || a.statut === 'en_cours');

  const impayes = useMemo(
    () =>
      data.factures
        .filter((f) => f.statut !== 'annulee' && f.statut !== 'brouillon' && resteAPayer(f) > 0)
        .sort((a, b) => resteAPayer(b) - resteAPayer(a)),
    [data.factures],
  );

  const totalImpaye = impayes.reduce((s, f) => s + resteAPayer(f), 0);

  const encaisseMois = useMemo(() => {
    const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    return data.factures.reduce(
      (s, f) =>
        s +
        f.paiements
          .filter((p) => new Date(`${p.date}T00:00:00`) >= debut)
          .reduce((t, p) => t + p.montant, 0),
      0,
    );
  }, [data.factures, maintenant]);

  const serieMensuelle = useMemo(() => {
    const mois: Array<{ label: string; valeur: number; cle: string }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      mois.push({
        label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d),
        valeur: 0,
        cle: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    for (const f of data.factures) {
      for (const p of f.paiements) {
        const cle = p.date.slice(0, 7);
        const cible = mois.find((m) => m.cle === cle);
        if (cible) cible.valeur += p.montant;
      }
    }
    return mois.map(({ label, valeur }) => ({ label, valeur }));
  }, [data.factures, maintenant]);

  /** Le moteur de règles est passé sur tout le cabinet, pas seulement sur un dossier. */
  const vigilance = useMemo(() => {
    const parPatient = new Map<string, Alerte[]>();
    for (const p of data.patients) {
      if (!p.actif) continue;
      const odonto = data.odontogrammes.find((o) => o.patientId === p.id);
      const charting = data.chartingsParo
        .filter((c) => c.patientId === p.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const liste = evaluerAlertes({
        patient: p,
        actes: data.actes.filter((a) => a.patientId === p.id),
        dents: odonto?.dents ?? [],
        charting,
      }).filter((a) => a.severite === 'critique' || a.severite === 'elevee');
      if (liste.length > 0) parPatient.set(p.id, liste);
    }
    return [...parPatient.entries()]
      .map(([patientId, liste]) => ({ patient: patientsParId.get(patientId)!, liste }))
      .sort((a, b) => {
        const critA = a.liste.filter((x) => x.severite === 'critique').length;
        const critB = b.liste.filter((x) => x.severite === 'critique').length;
        return critB - critA || b.liste.length - a.liste.length;
      });
  }, [data.patients, data.odontogrammes, data.actes, data.chartingsParo, patientsParId]);

  const totalAlertes = vigilance.reduce((n, v) => n + v.liste.length, 0);
  const totalCritiques = vigilance.reduce(
    (n, v) => n + v.liste.filter((a) => a.severite === 'critique').length,
    0,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500">
          {new Intl.DateTimeFormat('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }).format(maintenant)}
          {' · '}
          {data.cabinet.nom}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tuile
          label="Patients suivis"
          valeur={String(data.patients.filter((p) => p.actif).length)}
          detail={`${data.patients.length} dossiers au total`}
        />
        <Tuile
          label="Rendez-vous aujourd’hui"
          valeur={String(rdvAujourdhui.length)}
          detail={
            rdvAujourdhui.length > 0
              ? `Premier à ${formatHeure(rdvAujourdhui[0].debut)}`
              : 'Aucune consultation prévue'
          }
          accent="brand"
        />
        <Tuile
          label="Actes à réaliser"
          valeur={String(actesPlanifies.length)}
          detail={`${data.actes.filter((a) => a.statut === 'realise').length} actes réalisés`}
          accent="amber"
        />
        <Tuile
          label="Encaissé ce mois"
          valeur={formatMontant(encaisseMois, devise)}
          detail={`${formatMontant(totalImpaye, devise)} en attente`}
          accent="emerald"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            titre="Consultations du jour"
            sousTitre={`${rdvAujourdhui.length} rendez-vous`}
            action={
              <Link to="/agenda" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Voir l’agenda →
              </Link>
            }
          />
          {rdvAujourdhui.length === 0 ? (
            <EmptyState titre="Journée libre" description="Aucun rendez-vous n’est programmé aujourd’hui." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rdvAujourdhui.map((r) => {
                const p = patientsParId.get(r.patientId);
                const meta = STATUT_RDV_META[r.statut];
                return (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-14 shrink-0 text-sm font-bold text-slate-900">
                      {formatHeure(r.debut)}
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {p ? initiales(p.prenom, p.nom) : '—'}
                    </span>
                    <span className="min-w-0 flex-1">
                      {p ? (
                        <Link
                          to={`/patients/${p.id}`}
                          className="block truncate font-medium text-slate-800 hover:text-brand-700"
                        >
                          {p.prenom} {p.nom}
                        </Link>
                      ) : (
                        <span className="block truncate font-medium text-slate-400">Patient supprimé</span>
                      )}
                      <span className="block truncate text-sm text-slate-500">{r.motif}</span>
                    </span>
                    <span className="hidden text-right text-xs text-slate-500 sm:block">
                      {r.praticien}
                      <span className="block text-slate-400">
                        {r.salle} · {r.duree} min
                      </span>
                    </span>
                    <Badge ton={meta.ton}>{meta.libelle}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader titre="Encaissements" sousTitre="6 derniers mois" />
          <CardBody>
            <RevenueChart points={serieMensuelle} devise={devise} />
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Facturé (total)</dt>
                <dd className="font-semibold text-slate-800">
                  {formatMontant(
                    data.factures.filter((f) => f.statut !== 'annulee').reduce((s, f) => s + totalFacture(f), 0),
                    devise,
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Encaissé (total)</dt>
                <dd className="font-semibold text-emerald-700">
                  {formatMontant(
                    data.factures.reduce((s, f) => s + totalPaye(f), 0),
                    devise,
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Reste dû</dt>
                <dd className="font-semibold text-rose-700">{formatMontant(totalImpaye, devise)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader
            titre="Vigilance clinique"
            sousTitre={
              totalAlertes === 0
                ? 'Aucun point de vigilance sur le cabinet'
                : `${totalAlertes} point(s) à vérifier${totalCritiques > 0 ? `, dont ${totalCritiques} critique(s)` : ''}`
            }
          />
          {vigilance.length === 0 ? (
            <EmptyState
              titre="Rien à signaler"
              description="Aucune contre-indication ni lésion non prise en charge sur les dossiers actifs."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {vigilance.slice(0, 5).map(({ patient: p, liste }) => (
                <li key={p.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/patients/${p.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                      {p.prenom} {p.nom}
                    </Link>
                    <span className="text-xs text-slate-400">{age(p.dateNaissance)} ans</span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {liste.slice(0, 3).map((a) => (
                      <li key={a.regle} className="flex items-start gap-2 text-sm">
                        <Badge ton={a.severite === 'critique' ? 'danger' : 'alerte'}>
                          {a.severite === 'critique' ? 'Critique' : 'Élevée'}
                        </Badge>
                        <span className="text-slate-600">{a.titre}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            titre="Prochains rendez-vous"
            action={
              <Link to="/agenda" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Agenda →
              </Link>
            }
          />
          {prochainsRdv.length === 0 ? (
            <EmptyState titre="Rien de programmé" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {prochainsRdv.map((r) => {
                const p = patientsParId.get(r.patientId);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {p ? `${p.prenom} ${p.nom}` : 'Patient supprimé'}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{r.motif}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-slate-500">
                      {formatDate(r.debut)}
                      <span className="block font-semibold text-slate-700">{formatHeure(r.debut)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            titre="Factures impayées"
            action={
              <Link to="/facturation" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Facturation →
              </Link>
            }
          />
          {impayes.length === 0 ? (
            <EmptyState titre="Aucun impayé" description="Toutes les factures émises sont réglées." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {impayes.slice(0, 6).map((f) => {
                const p = patientsParId.get(f.patientId);
                return (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">
                        {p ? `${p.prenom} ${p.nom}` : 'Patient supprimé'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {f.numero} · {formatDate(f.date)}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-rose-700">
                      {formatMontant(resteAPayer(f), devise)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
