import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Facture, LigneFacture, MoyenPaiement, StatutFacture } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { resteAPayer, totalFacture, totalPaye } from '@/lib/finance';
import { aujourdHui, correspond, formatDate, formatMontant } from '@/lib/utils';

const META: Record<StatutFacture, { libelle: string; ton: 'neutre' | 'info' | 'succes' | 'alerte' | 'danger' }> = {
  brouillon: { libelle: 'Brouillon', ton: 'neutre' },
  emise: { libelle: 'Émise', ton: 'info' },
  partielle: { libelle: 'Partiellement réglée', ton: 'alerte' },
  payee: { libelle: 'Payée', ton: 'succes' },
  annulee: { libelle: 'Annulée', ton: 'danger' },
};

const MOYENS: Array<{ cle: MoyenPaiement; libelle: string }> = [
  { cle: 'carte', libelle: 'Carte bancaire' },
  { cle: 'especes', libelle: 'Espèces' },
  { cle: 'cheque', libelle: 'Chèque' },
  { cle: 'virement', libelle: 'Virement' },
  { cle: 'mutuelle', libelle: 'Mutuelle / tiers payant' },
];

export function Facturation() {
  const { data, ajouterFacture, majFacture, supprimerFacture, ajouterPaiement, supprimerPaiement } = useApp();
  const devise = data.cabinet.devise;
  const [requete, setRequete] = useState('');
  const [filtre, setFiltre] = useState<'toutes' | StatutFacture | 'impayees'>('toutes');
  const [detail, setDetail] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  const [nouvelle, setNouvelle] = useState<{ patientId: string; date: string; lignes: LigneFacture[]; notes: string }>({
    patientId: '',
    date: aujourdHui(),
    lignes: [{ acteId: null, libelle: '', quantite: 1, prixUnitaire: 0 }],
    notes: '',
  });

  const [paiement, setPaiement] = useState<{ montant: number; moyen: MoyenPaiement; date: string; reference: string }>({
    montant: 0,
    moyen: 'carte',
    date: aujourdHui(),
    reference: '',
  });

  const patientsParId = useMemo(() => new Map(data.patients.map((p) => [p.id, p])), [data.patients]);

  const liste = useMemo(
    () =>
      data.factures
        .filter((f) => {
          if (filtre === 'impayees' && (f.statut === 'annulee' || resteAPayer(f) === 0)) return false;
          if (filtre !== 'toutes' && filtre !== 'impayees' && f.statut !== filtre) return false;
          const p = patientsParId.get(f.patientId);
          return correspond(`${f.numero} ${p ? `${p.prenom} ${p.nom}` : ''}`, requete);
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.numero.localeCompare(a.numero)),
    [data.factures, filtre, requete, patientsParId],
  );

  const factureCourante = data.factures.find((f) => f.id === detail);

  const totaux = useMemo(() => {
    const valides = data.factures.filter((f) => f.statut !== 'annulee');
    return {
      facture: valides.reduce((s, f) => s + totalFacture(f), 0),
      encaisse: valides.reduce((s, f) => s + totalPaye(f), 0),
      du: valides.reduce((s, f) => s + resteAPayer(f), 0),
    };
  }, [data.factures]);

  const patientsTries = useMemo(
    () => [...data.patients].sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')),
    [data.patients],
  );

  const ouvrirCreation = () => {
    setNouvelle({
      patientId: patientsTries[0]?.id ?? '',
      date: aujourdHui(),
      lignes: [{ acteId: null, libelle: '', quantite: 1, prixUnitaire: 0 }],
      notes: '',
    });
    setCreation(true);
  };

  const totalNouvelle = nouvelle.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  const creer = () => {
    const lignes = nouvelle.lignes.filter((l) => l.libelle.trim());
    if (!nouvelle.patientId || lignes.length === 0) return;
    const facture = ajouterFacture({
      patientId: nouvelle.patientId,
      date: nouvelle.date,
      lignes,
      paiements: [],
      statut: 'emise',
      notes: nouvelle.notes,
    });
    setCreation(false);
    setDetail(facture.id);
  };

  const imprimer = (f: Facture) => {
    setDetail(f.id);
    setTimeout(() => window.print(), 60);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturation</h1>
          <p className="text-sm text-slate-500">{data.factures.length} facture(s) enregistrée(s)</p>
        </div>
        <Button onClick={ouvrirCreation}>+ Nouvelle facture</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total facturé</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMontant(totaux.facture, devise)}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Encaissé</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{formatMontant(totaux.encaisse, devise)}</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reste dû</p>
          <p className="mt-1 text-2xl font-bold text-rose-700">{formatMontant(totaux.du, devise)}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
          <Input
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Numéro ou patient…"
            className="max-w-xs"
            aria-label="Rechercher une facture"
          />
          <Select value={filtre} onChange={(e) => setFiltre(e.target.value as typeof filtre)} className="max-w-[16rem]" aria-label="Filtrer">
            <option value="toutes">Toutes les factures</option>
            <option value="impayees">Avec un reste dû</option>
            <option value="emise">Émises</option>
            <option value="partielle">Partiellement réglées</option>
            <option value="payee">Payées</option>
            <option value="annulee">Annulées</option>
          </Select>
        </div>

        {liste.length === 0 ? (
          <EmptyState titre="Aucune facture" description="Créez une facture ou facturez des actes réalisés." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-semibold">Numéro</th>
                  <th className="px-3 py-2.5 font-semibold">Patient</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Réglé</th>
                  <th className="px-3 py-2.5 font-semibold">Reste</th>
                  <th className="px-3 py-2.5 font-semibold">Statut</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liste.map((f) => {
                  const p = patientsParId.get(f.patientId);
                  return (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-800">{f.numero}</td>
                      <td className="px-3 py-3">
                        {p ? (
                          <Link to={`/patients/${p.id}`} className="text-slate-700 hover:text-brand-700">
                            {p.prenom} {p.nom}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Patient supprimé</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatDate(f.date)}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{formatMontant(totalFacture(f), devise)}</td>
                      <td className="px-3 py-3 text-emerald-700">{formatMontant(totalPaye(f), devise)}</td>
                      <td className="px-3 py-3 text-rose-700">{formatMontant(resteAPayer(f), devise)}</td>
                      <td className="px-3 py-3">
                        <Badge ton={META[f.statut].ton}>{META[f.statut].libelle}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button taille="sm" variante="secondaire" onClick={() => setDetail(f.id)}>
                            Détail
                          </Button>
                          <Button taille="sm" variante="fantome" onClick={() => imprimer(f)}>
                            Imprimer
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

      {/* Detail + payments */}
      <Modal
        ouvert={factureCourante !== undefined}
        titre={factureCourante ? `Facture ${factureCourante.numero}` : 'Facture'}
        sousTitre={factureCourante ? formatDate(factureCourante.date) : undefined}
        onFermer={() => setDetail(null)}
        largeur="lg"
        pied={
          factureCourante ? (
            <>
              <Button variante="danger" className="mr-auto" onClick={() => setASupprimer(factureCourante.id)}>
                Supprimer
              </Button>
              {factureCourante.statut !== 'annulee' ? (
                <Button
                  variante="secondaire"
                  onClick={() => majFacture(factureCourante.id, { statut: 'annulee' })}
                >
                  Annuler la facture
                </Button>
              ) : (
                <Button variante="secondaire" onClick={() => majFacture(factureCourante.id, { statut: 'emise' })}>
                  Réactiver
                </Button>
              )}
              <Button variante="secondaire" onClick={() => window.print()}>
                Imprimer
              </Button>
              <Button onClick={() => setDetail(null)}>Fermer</Button>
            </>
          ) : null
        }
      >
        {factureCourante ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{data.cabinet.nom}</p>
                  <p className="text-slate-500">{data.cabinet.adresse}</p>
                  <p className="text-slate-500">
                    {data.cabinet.telephone} · {data.cabinet.email}
                  </p>
                  <p className="text-xs text-slate-400">SIRET {data.cabinet.siret}</p>
                </div>
                <div className="text-right">
                  {(() => {
                    const p = patientsParId.get(factureCourante.patientId);
                    return p ? (
                      <>
                        <p className="font-semibold text-slate-900">
                          {p.prenom} {p.nom}
                        </p>
                        <p className="text-slate-500">{p.adresse}</p>
                        <p className="text-slate-500">{p.telephone}</p>
                        <p className="text-xs text-slate-400">{p.mutuelle}</p>
                      </>
                    ) : (
                      <p className="text-slate-400">Patient supprimé</p>
                    );
                  })()}
                </div>
              </div>

              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="py-2 font-semibold">Désignation</th>
                    <th className="py-2 text-right font-semibold">Qté</th>
                    <th className="py-2 text-right font-semibold">P.U.</th>
                    <th className="py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factureCourante.lignes.map((l, i) => (
                    <tr key={`${l.libelle}-${i}`}>
                      <td className="py-2 text-slate-700">{l.libelle}</td>
                      <td className="py-2 text-right text-slate-600">{l.quantite}</td>
                      <td className="py-2 text-right text-slate-600">{formatMontant(l.prixUnitaire, devise)}</td>
                      <td className="py-2 text-right font-medium text-slate-800">
                        {formatMontant(l.quantite * l.prixUnitaire, devise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td className="py-2 font-semibold text-slate-700" colSpan={3}>
                      Total
                    </td>
                    <td className="py-2 text-right font-bold text-slate-900">
                      {formatMontant(totalFacture(factureCourante), devise)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-600" colSpan={3}>
                      Déjà réglé
                    </td>
                    <td className="py-1 text-right text-emerald-700">
                      {formatMontant(totalPaye(factureCourante), devise)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold text-slate-700" colSpan={3}>
                      Reste à payer
                    </td>
                    <td className="py-1 text-right font-bold text-rose-700">
                      {formatMontant(resteAPayer(factureCourante), devise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              {factureCourante.notes ? (
                <p className="mt-3 text-xs text-slate-500">{factureCourante.notes}</p>
              ) : null}
            </div>

            <div className="no-print">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                Paiements ({factureCourante.paiements.length})
              </h3>
              {factureCourante.paiements.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun règlement enregistré.</p>
              ) : (
                <ul className="mb-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {factureCourante.paiements.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium text-slate-800">{formatMontant(p.montant, devise)}</span>
                        <span className="ml-2 text-slate-500">
                          {MOYENS.find((m) => m.cle === p.moyen)?.libelle ?? p.moyen}
                        </span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(p.date)}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-red-600"
                        onClick={() => supprimerPaiement(factureCourante.id, p.id)}
                      >
                        Supprimer
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {resteAPayer(factureCourante) > 0 && factureCourante.statut !== 'annulee' ? (
                <div className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">
                  <Field label="Montant">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={paiement.montant || ''}
                      placeholder={String(resteAPayer(factureCourante))}
                      onChange={(e) => setPaiement({ ...paiement, montant: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Moyen">
                    <Select
                      value={paiement.moyen}
                      onChange={(e) => setPaiement({ ...paiement, moyen: e.target.value as MoyenPaiement })}
                    >
                      {MOYENS.map((m) => (
                        <option key={m.cle} value={m.cle}>
                          {m.libelle}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Date">
                    <Input
                      type="date"
                      value={paiement.date}
                      onChange={(e) => setPaiement({ ...paiement, date: e.target.value })}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      onClick={() => {
                        const montant = paiement.montant || resteAPayer(factureCourante);
                        if (montant <= 0) return;
                        ajouterPaiement(factureCourante.id, {
                          montant,
                          moyen: paiement.moyen,
                          date: paiement.date,
                          reference: paiement.reference,
                        });
                        setPaiement({ montant: 0, moyen: 'carte', date: aujourdHui(), reference: '' });
                      }}
                    >
                      Encaisser
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Creation */}
      <Modal
        ouvert={creation}
        titre="Nouvelle facture"
        onFermer={() => setCreation(false)}
        largeur="lg"
        pied={
          <>
            <Button variante="secondaire" onClick={() => setCreation(false)}>
              Annuler
            </Button>
            <Button onClick={creer}>Créer la facture</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient">
              <Select
                value={nouvelle.patientId}
                onChange={(e) => setNouvelle({ ...nouvelle, patientId: e.target.value })}
              >
                {patientsTries.length === 0 ? <option value="">Aucun patient</option> : null}
                {patientsTries.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom.toUpperCase()} {p.prenom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={nouvelle.date}
                onChange={(e) => setNouvelle({ ...nouvelle, date: e.target.value })}
              />
            </Field>
          </div>

          <div>
            <span className="etiquette">Lignes</span>
            <div className="space-y-2">
              {nouvelle.lignes.map((l, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_80px_110px_40px]">
                  <Input
                    value={l.libelle}
                    placeholder="Désignation de l’acte"
                    onChange={(e) => {
                      const lignes = [...nouvelle.lignes];
                      lignes[i] = { ...l, libelle: e.target.value };
                      setNouvelle({ ...nouvelle, lignes });
                    }}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={l.quantite}
                    onChange={(e) => {
                      const lignes = [...nouvelle.lignes];
                      lignes[i] = { ...l, quantite: Math.max(1, Number(e.target.value)) };
                      setNouvelle({ ...nouvelle, lignes });
                    }}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={l.prixUnitaire}
                    onChange={(e) => {
                      const lignes = [...nouvelle.lignes];
                      lignes[i] = { ...l, prixUnitaire: Number(e.target.value) };
                      setNouvelle({ ...nouvelle, lignes });
                    }}
                  />
                  <Button
                    variante="fantome"
                    onClick={() =>
                      setNouvelle({ ...nouvelle, lignes: nouvelle.lignes.filter((_, j) => j !== i) })
                    }
                    aria-label="Supprimer la ligne"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button
              taille="sm"
              variante="secondaire"
              className="mt-2"
              onClick={() =>
                setNouvelle({
                  ...nouvelle,
                  lignes: [...nouvelle.lignes, { acteId: null, libelle: '', quantite: 1, prixUnitaire: 0 }],
                })
              }
            >
              + Ajouter une ligne
            </Button>
          </div>

          <Field label="Notes">
            <Textarea
              rows={2}
              value={nouvelle.notes}
              onChange={(e) => setNouvelle({ ...nouvelle, notes: e.target.value })}
            />
          </Field>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-right text-sm font-semibold text-slate-700">
            Total : {formatMontant(totalNouvelle, devise)}
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        ouvert={aSupprimer !== null}
        titre="Supprimer la facture"
        message="Cette facture et ses règlements seront définitivement supprimés."
        onAnnuler={() => setASupprimer(null)}
        onConfirmer={() => {
          if (aSupprimer) supprimerFacture(aSupprimer);
          setASupprimer(null);
          setDetail(null);
        }}
      />
    </div>
  );
}
