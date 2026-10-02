import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Acte, StatutActe } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import { ActeForm } from '@/components/ActeForm';
import type { BrouillonActe } from '@/components/ActeForm';
import { categoriesDe, trouverActeDans } from '@/data/nomenclatures';
import { correspond, formatDate, formatMontant } from '@/lib/utils';
import { resumerActes } from '@/lib/finance';

const META: Record<StatutActe, { libelle: string; ton: 'neutre' | 'violet' | 'succes' | 'danger' }> = {
  planifie: { libelle: 'Planifié', ton: 'neutre' },
  en_cours: { libelle: 'En cours', ton: 'violet' },
  realise: { libelle: 'Réalisé', ton: 'succes' },
  annule: { libelle: 'Annulé', ton: 'danger' },
};

export function Traitements() {
  const { data, ajouterActe, majActe, supprimerActe } = useApp();
  const [requete, setRequete] = useState('');
  const [statut, setStatut] = useState<'tous' | StatutActe>('tous');
  const [categorie, setCategorie] = useState('toutes');
  const [praticien, setPraticien] = useState('tous');
  const [form, setForm] = useState<{ ouvert: boolean; acte?: Acte }>({ ouvert: false });

  const patientsParId = useMemo(() => new Map(data.patients.map((p) => [p.id, p])), [data.patients]);

  const liste = useMemo(() => {
    return data.actes
      .filter((a) => {
        if (statut !== 'tous' && a.statut !== statut) return false;
        if (praticien !== 'tous' && a.praticien !== praticien) return false;
        if (categorie !== 'toutes' && trouverActeDans(data.cabinet.nomenclature, a.codeActe)?.categorie !== categorie)
          return false;
        const p = patientsParId.get(a.patientId);
        const cible = `${a.libelle} ${a.codeActe} ${p ? `${p.prenom} ${p.nom}` : ''} ${a.dents.join(' ')}`;
        return correspond(cible, requete);
      })
      .sort((a, b) => (b.dateRealisation ?? b.datePrevue).localeCompare(a.dateRealisation ?? a.datePrevue));
  }, [data.actes, data.cabinet.nomenclature, statut, praticien, categorie, requete, patientsParId]);

  const resume = useMemo(() => resumerActes(liste), [liste]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Traitements</h1>
          <p className="text-sm text-slate-500">
            {liste.length} acte(s) · {formatMontant(resume.total, data.cabinet.devise)} d’honoraires ·{' '}
            {formatMontant(resume.resteACharge, data.cabinet.devise)} de reste à charge
          </p>
        </div>
        <Button onClick={() => setForm({ ouvert: true })}>+ Nouvel acte</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {(['planifie', 'en_cours', 'realise', 'annule'] as StatutActe[]).map((s) => (
          <Card key={s} className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{META[s].libelle}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resume.parStatut[s]}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
          <Input
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Rechercher un acte, un patient, une dent…"
            className="max-w-xs"
            aria-label="Rechercher un acte"
          />
          <Select value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)} className="max-w-[11rem]" aria-label="Statut">
            <option value="tous">Tous les statuts</option>
            <option value="planifie">Planifié</option>
            <option value="en_cours">En cours</option>
            <option value="realise">Réalisé</option>
            <option value="annule">Annulé</option>
          </Select>
          <Select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="max-w-[12rem]" aria-label="Catégorie">
            <option value="toutes">Toutes les catégories</option>
            {categoriesDe(data.cabinet.nomenclature).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={praticien} onChange={(e) => setPraticien(e.target.value)} className="max-w-[14rem]" aria-label="Praticien">
            <option value="tous">Tous les praticiens</option>
            {data.cabinet.praticiens.map((p) => (
              <option key={p.id} value={p.nom}>
                {p.nom}
              </option>
            ))}
          </Select>
        </div>

        {liste.length === 0 ? (
          <EmptyState titre="Aucun acte" description="Ajustez les filtres ou créez un nouvel acte." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Patient</th>
                  <th className="px-3 py-2.5 font-semibold">Acte</th>
                  <th className="px-3 py-2.5 font-semibold">Dents</th>
                  <th className="px-3 py-2.5 font-semibold">Praticien</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Honoraires</th>
                  <th className="px-3 py-2.5 font-semibold">Statut</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liste.map((a) => {
                  const p = patientsParId.get(a.patientId);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        {p ? (
                          <Link to={`/patients/${p.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                            {p.prenom} {p.nom}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Patient supprimé</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-medium text-slate-800">{a.libelle}</span>
                        <span className="block text-xs text-slate-400">{a.codeActe}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {a.dents.length ? a.dents.join(', ') : <span className="text-slate-400">Général</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{a.praticien}</td>
                      <td className="px-3 py-3 text-slate-600">{formatDate(a.dateRealisation ?? a.datePrevue)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {formatMontant(a.tarif, data.cabinet.devise)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge ton={META[a.statut].ton}>{META[a.statut].libelle}</Badge>
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
                              Réalisé
                            </Button>
                          ) : null}
                          <Button taille="sm" variante="secondaire" onClick={() => setForm({ ouvert: true, acte: a })}>
                            Modifier
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ActeForm
        ouvert={form.ouvert}
        acte={form.acte}
        onFermer={() => setForm({ ouvert: false })}
        onEnregistrer={(b: BrouillonActe) => {
          if (form.acte) majActe(form.acte.id, b);
          else ajouterActe(b);
          setForm({ ouvert: false });
        }}
        onSupprimer={
          form.acte
            ? () => {
                supprimerActe(form.acte!.id);
                setForm({ ouvert: false });
              }
            : undefined
        }
      />
    </div>
  );
}
