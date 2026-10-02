import { useMemo, useState } from 'react';
import type { ChartingParo, DentPerio, Patient } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Field';
import { GrilleParo } from '@/components/perio/GrilleParo';
import { PanneauDiagnostic } from '@/components/perio/PanneauDiagnostic';
import { calculerIndices, dentPerioVide, diagnostiquer } from '@/data/perio';
import { arcades } from '@/data/teeth';
import { age, formatDate, maintenant } from '@/lib/utils';

function chartingVierge(patient: Patient, praticien: string): Omit<ChartingParo, 'id'> {
  const { haut, bas } = arcades('permanente');
  return {
    patientId: patient.id,
    date: maintenant(),
    praticien,
    dents: [...haut, ...bas].map(dentPerioVide),
    perteOsseusePct: null,
    fumeur: patient.facteursRisque.tabac,
    diabete: patient.facteursRisque.diabete,
    notes: '',
  };
}

/** Reprend les mesures du sondage précédent : une réévaluation part de l'existant. */
function dupliquer(source: ChartingParo, praticien: string): Omit<ChartingParo, 'id'> {
  return {
    ...source,
    date: maintenant(),
    praticien,
    notes: '',
    dents: source.dents.map((d) => ({ ...d, sites: { ...d.sites } })),
  };
}

export function OngletParodontie({ patient }: { patient: Patient }) {
  const { data, praticienActif, enregistrerCharting, supprimerCharting, odontogramme } = useApp();
  const [brouillon, setBrouillon] = useState<Omit<ChartingParo, 'id'> | null>(null);
  const [consulte, setConsulte] = useState<string | null>(null);

  const historique = useMemo(
    () => data.chartingsParo.filter((c) => c.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date)),
    [data.chartingsParo, patient.id],
  );

  const odonto = odontogramme(patient.id);
  const absentes = odonto.dents.filter((d) => d.etat === 'absente').map((d) => d.numero);
  const ageAns = age(patient.dateNaissance);

  const affiche: ChartingParo | null = brouillon
    ? ({ ...brouillon, id: 'brouillon' } as ChartingParo)
    : (historique.find((c) => c.id === consulte) ?? historique[0] ?? null);

  const diagnostic = useMemo(
    () => (affiche ? diagnostiquer(affiche, ageAns, absentes) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [affiche, ageAns, absentes.join(',')],
  );

  const evolution = useMemo(() => {
    if (historique.length < 2) return null;
    const [recent, precedent] = historique;
    const a = calculerIndices(recent, absentes);
    const b = calculerIndices(precedent, absentes);
    return {
      depuis: precedent.date,
      bop: Math.round((a.bopPct - b.bopPct) * 10) / 10,
      poches4: Math.round((a.poches4Pct - b.poches4Pct) * 10) / 10,
      pdMax: a.pdMax - b.pdMax,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historique, absentes.join(',')]);

  const enregistrer = () => {
    if (!brouillon) return;
    enregistrerCharting(brouillon);
    setBrouillon(null);
    setConsulte(null);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          titre="Charting parodontal"
          sousTitre={
            brouillon
              ? 'Sondage en cours — saisissez les profondeurs, la grille enchaîne automatiquement.'
              : affiche
                ? `Sondage du ${formatDate(affiche.date)} par ${affiche.praticien}`
                : 'Aucun sondage enregistré'
          }
          action={
            brouillon ? (
              <>
                <Button variante="secondaire" onClick={() => setBrouillon(null)}>
                  Annuler
                </Button>
                <Button onClick={enregistrer}>Enregistrer le sondage</Button>
              </>
            ) : (
              <>
                {historique.length > 0 ? (
                  <Button
                    variante="secondaire"
                    onClick={() => setBrouillon(dupliquer(historique[0], praticienActif))}
                  >
                    Réévaluation
                  </Button>
                ) : null}
                <Button onClick={() => setBrouillon(chartingVierge(patient, praticienActif))}>
                  + Nouveau sondage
                </Button>
              </>
            )
          }
        />

        {affiche ? (
          <CardBody className="space-y-4">
            {brouillon ? (
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
                <strong>Saisie rapide :</strong> tapez la profondeur, le curseur avance seul. Sur une case de
                poche : <kbd className="rounded border border-brand-300 bg-white px-1">S</kbd> saignement,{' '}
                <kbd className="rounded border border-brand-300 bg-white px-1">P</kbd> plaque,{' '}
                <kbd className="rounded border border-brand-300 bg-white px-1">U</kbd> suppuration,{' '}
                <kbd className="rounded border border-brand-300 bg-white px-1">←</kbd>{' '}
                <kbd className="rounded border border-brand-300 bg-white px-1">→</kbd> pour naviguer.
              </div>
            ) : null}

            <GrilleParo
              charting={affiche}
              absentes={absentes}
              lectureSeule={!brouillon}
              onChange={(dents: DentPerio[]) => setBrouillon((b) => (b ? { ...b, dents } : b))}
            />

            {brouillon ? (
              <Textarea
                rows={2}
                placeholder="Observations du sondage, plan de traitement parodontal…"
                value={brouillon.notes}
                onChange={(e) => setBrouillon({ ...brouillon, notes: e.target.value })}
              />
            ) : affiche.notes ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{affiche.notes}</p>
            ) : null}
          </CardBody>
        ) : (
          <EmptyState
            titre="Aucun sondage parodontal"
            description="Un sondage complet mesure six sites par dent et calcule automatiquement le stade et le grade."
            action={
              <Button onClick={() => setBrouillon(chartingVierge(patient, praticienActif))}>
                + Nouveau sondage
              </Button>
            }
          />
        )}
      </Card>

      {diagnostic && affiche ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <Card>
            <CardHeader titre="Diagnostic parodontal" />
            <CardBody>
              <PanneauDiagnostic
                diagnostic={diagnostic}
                charting={affiche}
                lectureSeule={!brouillon}
                onChange={(patch) => setBrouillon((b) => (b ? { ...b, ...patch } : b))}
              />
            </CardBody>
          </Card>

          <Card className="self-start">
            <CardHeader titre="Historique" sousTitre={`${historique.length} sondage(s)`} />
            <CardBody className="space-y-3">
              {evolution ? (
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Évolution depuis le {formatDate(evolution.depuis)}
                  </p>
                  {(
                    [
                      ['Saignement', evolution.bop, '%'],
                      ['Poches ≥ 4 mm', evolution.poches4, '%'],
                      ['Poche maximale', evolution.pdMax, 'mm'],
                    ] as Array<[string, number, string]>
                  ).map(([label, delta, unite]) => (
                    <div key={label} className="flex items-center justify-between py-0.5">
                      <span className="text-slate-600">{label}</span>
                      <span
                        className={
                          delta < 0 ? 'font-semibold text-emerald-700' : delta > 0 ? 'font-semibold text-rose-700' : 'text-slate-500'
                        }
                      >
                        {delta > 0 ? '+' : ''}
                        {delta} {unite}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {historique.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun sondage archivé.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {historique.map((c) => {
                    const actif = !brouillon && affiche.id === c.id;
                    const ind = calculerIndices(c, absentes);
                    return (
                      <li key={c.id} className="py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBrouillon(null);
                            setConsulte(c.id);
                          }}
                          className="w-full text-left"
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className={actif ? 'font-semibold text-brand-700' : 'text-slate-700'}>
                              {formatDate(c.date)}
                            </span>
                            <Badge ton={ind.bopPct >= 10 ? 'danger' : 'succes'}>{ind.bopPct} % BOP</Badge>
                          </span>
                          <span className="block text-xs text-slate-400">
                            {c.praticien} · poche max {ind.pdMax} mm
                          </span>
                        </button>
                        <button
                          type="button"
                          className="mt-1 text-xs text-slate-400 hover:text-red-600"
                          onClick={() => supprimerCharting(c.id)}
                        >
                          Supprimer
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
