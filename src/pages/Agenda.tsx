import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { RendezVous } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { STATUT_RDV_META } from '@/data/rendezVous';
import { RdvForm } from '@/components/RdvForm';
import type { BrouillonRdv } from '@/components/RdvForm';
import { cx, debutSemaine, formatDate, formatHeure, memeJour } from '@/lib/utils';


const HEURE_DEBUT = 8;
const HEURE_FIN = 20;
const PX_PAR_HEURE = 60;
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function Agenda() {
  const { data, ajouterRdv, majRdv, supprimerRdv } = useApp();
  const [ancre, setAncre] = useState(() => debutSemaine(new Date()));
  const [praticienFiltre, setPraticienFiltre] = useState('tous');
  const [vue, setVue] = useState<'semaine' | 'liste'>('semaine');
  const [parametres, setParametres] = useSearchParams();
  const [formOuvert, setFormOuvert] = useState(parametres.get('nouveau') === '1');
  const [rdvEdite, setRdvEdite] = useState<RendezVous | undefined>();
  const [creneauPropose, setCreneauPropose] = useState<string | undefined>();

  const jours = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ancre);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [ancre],
  );

  const patientsParId = useMemo(() => new Map(data.patients.map((p) => [p.id, p])), [data.patients]);

  const rdvSemaine = useMemo(() => {
    const fin = new Date(ancre);
    fin.setDate(fin.getDate() + 7);
    return data.rendezVous.filter((r) => {
      const d = new Date(r.debut);
      if (d < ancre || d >= fin) return false;
      if (praticienFiltre !== 'tous' && r.praticien !== praticienFiltre) return false;
      return true;
    });
  }, [data.rendezVous, ancre, praticienFiltre]);

  const aVenir = useMemo(
    () =>
      data.rendezVous
        .filter((r) => new Date(r.debut) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .filter((r) => praticienFiltre === 'tous' || r.praticien === praticienFiltre)
        .sort((a, b) => a.debut.localeCompare(b.debut)),
    [data.rendezVous, praticienFiltre],
  );

  const couleurPraticien = (nom: string) =>
    data.cabinet.praticiens.find((p) => p.nom === nom)?.couleur ?? '#64748b';

  const ouvrirCreation = (date?: Date) => {
    setRdvEdite(undefined);
    setCreneauPropose(date?.toISOString());
    setFormOuvert(true);
  };

  const ouvrirEdition = (r: RendezVous) => {
    setRdvEdite(r);
    setCreneauPropose(undefined);
    setFormOuvert(true);
  };

  const enregistrer = (b: BrouillonRdv) => {
    if (rdvEdite) majRdv(rdvEdite.id, b);
    else ajouterRdv(b);
    setFormOuvert(false);
  };

  const libelleSemaine = `${formatDate(jours[0].toISOString())} – ${formatDate(jours[6].toISOString())}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">
            {rdvSemaine.length} rendez-vous cette semaine · {libelleSemaine}
          </p>
        </div>
        <Button onClick={() => ouvrirCreation()}>+ Nouveau rendez-vous</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              variante="secondaire"
              taille="sm"
              onClick={() => {
                const d = new Date(ancre);
                d.setDate(d.getDate() - 7);
                setAncre(d);
              }}
              aria-label="Semaine précédente"
            >
              ←
            </Button>
            <Button variante="secondaire" taille="sm" onClick={() => setAncre(debutSemaine(new Date()))}>
              Aujourd’hui
            </Button>
            <Button
              variante="secondaire"
              taille="sm"
              onClick={() => {
                const d = new Date(ancre);
                d.setDate(d.getDate() + 7);
                setAncre(d);
              }}
              aria-label="Semaine suivante"
            >
              →
            </Button>
          </div>
          <span className="ml-1 text-sm font-semibold text-slate-700">{libelleSemaine}</span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              value={praticienFiltre}
              onChange={(e) => setPraticienFiltre(e.target.value)}
              className="max-w-[14rem]"
              aria-label="Filtrer par praticien"
            >
              <option value="tous">Tous les praticiens</option>
              {data.cabinet.praticiens.map((p) => (
                <option key={p.id} value={p.nom}>
                  {p.nom}
                </option>
              ))}
            </Select>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              {(['semaine', 'liste'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVue(v)}
                  className={cx(
                    'px-3 py-1.5 text-xs font-semibold capitalize',
                    vue === v ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {vue === 'semaine' ? (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200">
                <div />
                {jours.map((j, i) => {
                  const auj = memeJour(j, new Date());
                  return (
                    <div
                      key={j.toISOString()}
                      className={cx('border-l border-slate-200 px-2 py-2 text-center', auj && 'bg-brand-50')}
                    >
                      <p className={cx('text-xs font-semibold', auj ? 'text-brand-700' : 'text-slate-500')}>
                        {JOURS[i]}
                      </p>
                      <p className={cx('text-lg font-bold', auj ? 'text-brand-700' : 'text-slate-800')}>
                        {j.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-[64px_repeat(7,1fr)]">
                <div>
                  {Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => (
                    <div
                      key={i}
                      style={{ height: PX_PAR_HEURE }}
                      className="border-b border-slate-100 pr-2 text-right"
                    >
                      {/* Nudged up so the label reads as sitting on its gridline. */}
                      <span className="relative -top-1.5 text-[11px] text-slate-400">
                        {String(HEURE_DEBUT + i).padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {jours.map((j) => {
                  const duJour = rdvSemaine
                    .filter((r) => memeJour(r.debut, j))
                    .sort((a, b) => a.debut.localeCompare(b.debut));
                  return (
                    <div key={j.toISOString()} className="relative border-l border-slate-200">
                      {Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Créer un rendez-vous le ${formatDate(j.toISOString())} à ${HEURE_DEBUT + i}h`}
                          onClick={() => {
                            const d = new Date(j);
                            d.setHours(HEURE_DEBUT + i, 0, 0, 0);
                            ouvrirCreation(d);
                          }}
                          style={{ height: PX_PAR_HEURE }}
                          className="block w-full border-b border-slate-100 transition-colors hover:bg-brand-50/60"
                        />
                      ))}

                      {duJour.map((r) => {
                        const d = new Date(r.debut);
                        const minutes = (d.getHours() - HEURE_DEBUT) * 60 + d.getMinutes();
                        const top = (minutes / 60) * PX_PAR_HEURE;
                        const hauteur = Math.max(22, (r.duree / 60) * PX_PAR_HEURE - 2);
                        if (minutes < 0 || d.getHours() >= HEURE_FIN) return null;
                        const p = patientsParId.get(r.patientId);
                        const meta = STATUT_RDV_META[r.statut];
                        const nom = p ? `${p.prenom} ${p.nom.charAt(0)}.` : '—';
                        // Short slots only have room for one line.
                        const compact = hauteur < 34;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            title={`${formatHeure(r.debut)} · ${nom} · ${r.motif} · ${r.praticien}`}
                            onClick={() => ouvrirEdition(r)}
                            style={{
                              top,
                              height: hauteur,
                              borderLeftColor: couleurPraticien(r.praticien),
                            }}
                            className={cx(
                              'absolute left-1 right-1 overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:shadow-md',
                              meta.barre,
                              r.statut === 'annule' && 'line-through opacity-60',
                            )}
                          >
                            <span className="block truncate font-semibold text-slate-800">
                              {formatHeure(r.debut)} {nom}
                              {compact ? <span className="font-normal text-slate-600"> · {r.motif}</span> : null}
                            </span>
                            {compact ? null : (
                              <span className="block truncate text-slate-600">{r.motif}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : aVenir.length === 0 ? (
          <EmptyState titre="Aucun rendez-vous à venir" action={<Button onClick={() => ouvrirCreation()}>+ Nouveau rendez-vous</Button>} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {aVenir.map((r) => {
              const p = patientsParId.get(r.patientId);
              const meta = STATUT_RDV_META[r.statut];
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="w-32 shrink-0 text-sm">
                    <span className="block font-semibold text-slate-800">{formatDate(r.debut)}</span>
                    <span className="block text-xs text-slate-500">
                      {formatHeure(r.debut)} · {r.duree} min
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    {p ? (
                      <Link to={`/patients/${p.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                        {p.prenom} {p.nom}
                      </Link>
                    ) : (
                      <span className="text-slate-400">Patient supprimé</span>
                    )}
                    <span className="block truncate text-sm text-slate-500">{r.motif}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {r.praticien}
                    <span className="block text-slate-400">{r.salle}</span>
                  </span>
                  <Badge ton={meta.ton}>{meta.libelle}</Badge>
                  <Button taille="sm" variante="secondaire" onClick={() => ouvrirEdition(r)}>
                    Modifier
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <RdvForm
        ouvert={formOuvert}
        rdv={rdvEdite}
        debutPropose={creneauPropose}
        onFermer={() => {
          setFormOuvert(false);
          if (parametres.has('nouveau')) {
            parametres.delete('nouveau');
            setParametres(parametres, { replace: true });
          }
        }}
        onEnregistrer={enregistrer}
        onSupprimer={
          rdvEdite
            ? () => {
                supprimerRdv(rdvEdite.id);
                setFormOuvert(false);
              }
            : undefined
        }
      />
    </div>
  );
}
