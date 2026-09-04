import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PatientForm } from '@/components/PatientForm';
import type { BrouillonPatient } from '@/components/PatientForm';
import { age, correspond, formatDate, initiales } from '@/lib/utils';

type Tri = 'nom' | 'recent' | 'age';

export function Patients() {
  const { data, ajouterPatient, supprimerPatient } = useApp();
  const navigate = useNavigate();
  const [requete, setRequete] = useState('');
  const [filtre, setFiltre] = useState<'tous' | 'actifs' | 'inactifs' | 'alertes'>('tous');
  const [tri, setTri] = useState<Tri>('nom');
  const [formOuvert, setFormOuvert] = useState(false);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const liste = useMemo(() => {
    const filtres = data.patients.filter((p) => {
      if (filtre === 'actifs' && !p.actif) return false;
      if (filtre === 'inactifs' && p.actif) return false;
      if (filtre === 'alertes' && p.alertes.length === 0 && p.allergies.length === 0) return false;
      return (
        correspond(`${p.prenom} ${p.nom}`, requete) ||
        correspond(p.telephone, requete) ||
        correspond(p.email, requete) ||
        correspond(p.numeroSecu, requete)
      );
    });
    const trie = [...filtres];
    if (tri === 'nom') trie.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
    if (tri === 'recent') trie.sort((a, b) => b.majLe.localeCompare(a.majLe));
    if (tri === 'age') trie.sort((a, b) => a.dateNaissance.localeCompare(b.dateNaissance));
    return trie;
  }, [data.patients, filtre, requete, tri]);

  const prochainRdv = (patientId: string) => {
    const futurs = data.rendezVous
      .filter((r) => r.patientId === patientId && new Date(r.debut) > new Date() && r.statut !== 'annule')
      .sort((a, b) => a.debut.localeCompare(b.debut));
    return futurs[0];
  };

  const patientSupprime = data.patients.find((p) => p.id === aSupprimer);

  const creer = (b: BrouillonPatient) => {
    const p = ajouterPatient(b);
    setFormOuvert(false);
    navigate(`/patients/${p.id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500">
            {liste.length} dossier{liste.length > 1 ? 's' : ''} affiché{liste.length > 1 ? 's' : ''} sur{' '}
            {data.patients.length}
          </p>
        </div>
        <Button onClick={() => setFormOuvert(true)}>+ Nouveau patient</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
          <Input
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Rechercher…"
            className="max-w-xs"
            aria-label="Rechercher un patient"
          />
          <Select
            value={filtre}
            onChange={(e) => setFiltre(e.target.value as typeof filtre)}
            className="max-w-[12rem]"
            aria-label="Filtrer"
          >
            <option value="tous">Tous les patients</option>
            <option value="actifs">Suivi en cours</option>
            <option value="inactifs">Dossiers inactifs</option>
            <option value="alertes">Avec alerte médicale</option>
          </Select>
          <Select
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            className="max-w-[12rem]"
            aria-label="Trier"
          >
            <option value="nom">Tri : nom</option>
            <option value="recent">Tri : mise à jour</option>
            <option value="age">Tri : âge décroissant</option>
          </Select>
        </div>

        {liste.length === 0 ? (
          <EmptyState
            titre="Aucun patient trouvé"
            description="Modifiez la recherche ou créez un nouveau dossier."
            action={<Button onClick={() => setFormOuvert(true)}>+ Nouveau patient</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Patient</th>
                  <th className="px-3 py-2.5 font-semibold">Âge</th>
                  <th className="px-3 py-2.5 font-semibold">Contact</th>
                  <th className="px-3 py-2.5 font-semibold">Prochain RDV</th>
                  <th className="px-3 py-2.5 font-semibold">Alertes</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liste.map((p) => {
                  const rdv = prochainRdv(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link to={`/patients/${p.id}`} className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {initiales(p.prenom, p.nom)}
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-800">
                              {p.prenom} {p.nom}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {p.mutuelle || 'Sans mutuelle'}
                              {!p.actif ? ' · dossier inactif' : ''}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{age(p.dateNaissance)} ans</td>
                      <td className="px-3 py-3 text-slate-600">
                        {p.telephone}
                        <span className="block text-xs text-slate-400">{p.email || '—'}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {rdv ? formatDate(rdv.debut) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.allergies.map((a) => (
                            <Badge key={a} ton="danger">
                              {a}
                            </Badge>
                          ))}
                          {p.alertes.map((a) => (
                            <Badge key={a} ton="alerte">
                              {a.length > 28 ? `${a.slice(0, 28)}…` : a}
                            </Badge>
                          ))}
                          {p.allergies.length === 0 && p.alertes.length === 0 ? (
                            <span className="text-xs text-slate-400">Aucune</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button taille="sm" variante="secondaire" onClick={() => navigate(`/patients/${p.id}`)}>
                            Ouvrir
                          </Button>
                          <Button taille="sm" variante="fantome" onClick={() => setASupprimer(p.id)}>
                            Supprimer
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

      <PatientForm ouvert={formOuvert} onFermer={() => setFormOuvert(false)} onEnregistrer={creer} />

      <ConfirmDialog
        ouvert={aSupprimer !== null}
        titre="Supprimer le dossier"
        message={
          patientSupprime
            ? `Le dossier de ${patientSupprime.prenom} ${patientSupprime.nom}, son schéma dentaire, ses actes, rendez-vous et factures seront définitivement supprimés.`
            : ''
        }
        onAnnuler={() => setASupprimer(null)}
        onConfirmer={() => {
          if (aSupprimer) supprimerPatient(aSupprimer);
          setASupprimer(null);
        }}
      />
    </div>
  );
}

