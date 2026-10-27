import { useMemo, useState } from 'react';
import type { ArticleStock, CategorieFourniture, Fournisseur } from '@/types';
import { useApp } from '@/store/AppContext';
import {
  CATALOGUE_DEPART,
  CATEGORIES_FOURNITURE,
  LIBELLE_CATEGORIE_FOURNITURE,
  UNITES,
  commandesAPasser,
  sousLeSeuil,
  valeurDuStock,
} from '@/data/fournitures';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/lib/utils';

const ARTICLE_VIDE: Omit<ArticleStock, 'id'> = {
  libelle: '',
  categorie: 'hygiene',
  unite: 'boîte',
  reference: '',
  stock: 0,
  seuil: 2,
  quantiteCommande: 1,
  prixUnitaire: 0,
  fournisseurId: null,
};

const FOURNISSEUR_VIDE: Omit<Fournisseur, 'id'> = {
  nom: '',
  contact: '',
  telephone: '',
  email: '',
  note: '',
};

function FormulaireArticle({
  valeur,
  fournisseurs,
  onChange,
}: {
  valeur: Omit<ArticleStock, 'id'>;
  fournisseurs: Fournisseur[];
  onChange: (v: Omit<ArticleStock, 'id'>) => void;
}) {
  const set = <K extends keyof Omit<ArticleStock, 'id'>>(
    cle: K,
    v: Omit<ArticleStock, 'id'>[K],
  ) => onChange({ ...valeur, [cle]: v });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Désignation">
          <Input
            value={valeur.libelle}
            onChange={(e) => set('libelle', e.target.value)}
            placeholder="Gants nitrile non poudrés, taille M"
            list="catalogue-depart"
          />
        </Field>
        {/* Le catalogue générique sert de suggestion, jamais d'imposition. */}
        <datalist id="catalogue-depart">
          {CATALOGUE_DEPART.map((m) => (
            <option key={m.libelle} value={m.libelle} />
          ))}
        </datalist>
      </div>

      <Field label="Catégorie">
        <Select
          value={valeur.categorie}
          onChange={(e) => set('categorie', e.target.value as CategorieFourniture)}
        >
          {CATEGORIES_FOURNITURE.map((c) => (
            <option key={c} value={c}>
              {LIBELLE_CATEGORIE_FOURNITURE[c]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Unité de commande">
        <Select value={valeur.unite} onChange={(e) => set('unite', e.target.value)}>
          {UNITES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Référence fournisseur">
        <Input value={valeur.reference} onChange={(e) => set('reference', e.target.value)} />
      </Field>

      <Field label="Fournisseur">
        <Select
          value={valeur.fournisseurId ?? ''}
          onChange={(e) => set('fournisseurId', e.target.value || null)}
        >
          <option value="">Non rattaché</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nom}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="En stock">
        <Input
          type="number"
          min={0}
          value={valeur.stock}
          onChange={(e) => set('stock', Math.max(0, Number(e.target.value) || 0))}
        />
      </Field>

      <Field label="Seuil d’alerte" aide="En dessous ou à égalité, l’article est à recommander.">
        <Input
          type="number"
          min={0}
          value={valeur.seuil}
          onChange={(e) => set('seuil', Math.max(0, Number(e.target.value) || 0))}
        />
      </Field>

      <Field label="Quantité par commande">
        <Input
          type="number"
          min={1}
          value={valeur.quantiteCommande}
          onChange={(e) => set('quantiteCommande', Math.max(1, Number(e.target.value) || 1))}
        />
      </Field>

      <Field label="Prix unitaire">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={valeur.prixUnitaire}
          onChange={(e) => set('prixUnitaire', Math.max(0, Number(e.target.value) || 0))}
        />
      </Field>
    </div>
  );
}

export function Approvisionnement() {
  const {
    data,
    ajouterArticle,
    majArticle,
    supprimerArticle,
    ajusterStock,
    ajouterFournisseur,
    supprimerFournisseur,
  } = useApp();

  const devise = data.cabinet.devise ?? 'MAD';
  const [edite, setEdite] = useState<{ id: string | null; valeur: Omit<ArticleStock, 'id'> } | null>(null);
  const [nouveauFournisseur, setNouveauFournisseur] = useState<Omit<Fournisseur, 'id'> | null>(null);
  const [aSupprimer, setASupprimer] = useState<ArticleStock | null>(null);
  const [bon, setBon] = useState<string | null>(null);
  const [categorie, setCategorie] = useState<CategorieFourniture | 'tout'>('tout');

  const commandes = useMemo(
    () => commandesAPasser(data.stock, data.fournisseurs),
    [data.stock, data.fournisseurs],
  );
  const aRecommander = data.stock.filter(sousLeSeuil);
  const visibles =
    categorie === 'tout' ? data.stock : data.stock.filter((a) => a.categorie === categorie);

  const somme = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${devise}`;
  const bonAffiche = commandes.find((c) => (c.fournisseur?.id ?? '') === bon);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          titre="Approvisionnement"
          sousTitre="Stock des consommables, seuils de réapprovisionnement et bons de commande"
          action={
            <>
              <Button variante="secondaire" onClick={() => setNouveauFournisseur(FOURNISSEUR_VIDE)}>
                + Fournisseur
              </Button>
              <Button onClick={() => setEdite({ id: null, valeur: ARTICLE_VIDE })}>+ Article</Button>
            </>
          }
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Références</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{data.stock.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">À recommander</p>
              <p
                className={
                  aRecommander.length ? 'mt-1 text-lg font-bold text-amber-700' : 'mt-1 text-lg font-bold text-slate-900'
                }
              >
                {aRecommander.length}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valeur du stock</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{somme(valeurDuStock(data.stock))}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {commandes.length ? (
        <Card>
          <CardHeader
            titre="Commandes à passer"
            sousTitre="Regroupées par fournisseur, à partir des articles au seuil ou en dessous"
          />
          <CardBody className="space-y-3">
            {commandes.map((c) => (
              <div
                key={c.fournisseur?.id ?? 'sans'}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {c.fournisseur?.nom ?? 'Articles sans fournisseur'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.lignes.length} référence(s) · {somme(c.total)}
                  </p>
                </div>
                {c.fournisseur ? (
                  <Button taille="sm" variante="secondaire" onClick={() => setBon(c.fournisseur!.id)}>
                    Bon de commande
                  </Button>
                ) : (
                  /*
                   * Pas de bon sans destinataire : un document sans à qui
                   * l'envoyer n'est pas un bon de commande.
                   */
                  <Badge ton="alerte">Rattachez un fournisseur</Badge>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          titre="Stock"
          action={
            <Select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as CategorieFourniture | 'tout')}
            >
              <option value="tout">Toutes catégories</option>
              {CATEGORIES_FOURNITURE.map((c) => (
                <option key={c} value={c}>
                  {LIBELLE_CATEGORIE_FOURNITURE[c]}
                </option>
              ))}
            </Select>
          }
        />
        <CardBody>
          {visibles.length === 0 ? (
            <EmptyState
              titre="Aucun article"
              description="Ajoutez vos consommables pour suivre leur niveau et préparer vos commandes."
              action={<Button onClick={() => setEdite({ id: null, valeur: ARTICLE_VIDE })}>+ Article</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3">Désignation</th>
                    <th className="pb-2 pr-3">Fournisseur</th>
                    <th className="pb-2 pr-3 text-right">Stock</th>
                    <th className="pb-2 pr-3 text-right">Seuil</th>
                    <th className="pb-2 pr-3 text-right">Prix</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((a) => {
                    const bas = sousLeSeuil(a);
                    return (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3">
                          <p className="font-medium text-slate-900">{a.libelle}</p>
                          <p className="text-xs text-slate-500">
                            {LIBELLE_CATEGORIE_FOURNITURE[a.categorie]}
                            {a.reference ? ` · ${a.reference}` : ''}
                          </p>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">
                          {data.fournisseurs.find((f) => f.id === a.fournisseurId)?.nom ?? (
                            <span className="text-slate-400">non rattaché</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              aria-label={`Retirer une unité de ${a.libelle}`}
                              onClick={() => ajusterStock(a.id, -1)}
                              className="h-6 w-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              −
                            </button>
                            <span
                              className={
                                bas
                                  ? 'w-12 text-center font-semibold tabular-nums text-amber-700'
                                  : 'w-12 text-center font-semibold tabular-nums text-slate-900'
                              }
                            >
                              {a.stock}
                            </span>
                            <button
                              type="button"
                              aria-label={`Ajouter une unité de ${a.libelle}`}
                              onClick={() => ajusterStock(a.id, 1)}
                              className="h-6 w-6 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                              +
                            </button>
                          </div>
                          <p className="mt-0.5 text-right text-xs text-slate-400">{a.unite}</p>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{a.seuil}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-600">
                          {somme(a.prixUnitaire)}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {bas ? <Badge ton="alerte">À commander</Badge> : null}
                            <Button
                              taille="sm"
                              variante="fantome"
                              onClick={() => setEdite({ id: a.id, valeur: a })}
                            >
                              Modifier
                            </Button>
                            <Button taille="sm" variante="fantome" onClick={() => setASupprimer(a)}>
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
        </CardBody>
      </Card>

      <Card>
        <CardHeader titre="Fournisseurs" sousTitre={`${data.fournisseurs.length} enregistré(s)`} />
        <CardBody>
          {data.fournisseurs.length === 0 ? (
            <EmptyState
              titre="Aucun fournisseur"
              description="Ajoutez vos dépôts et représentants pour pouvoir éditer des bons de commande."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.fournisseurs.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{f.nom}</p>
                    <p className="text-xs text-slate-500">
                      {[f.contact, f.telephone, f.email].filter(Boolean).join(' · ') || 'Aucun contact renseigné'}
                    </p>
                  </div>
                  <Button taille="sm" variante="fantome" onClick={() => supprimerFournisseur(f.id)}>
                    Retirer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* ------------------------------------------------ Formulaire article */}
      {edite ? (
        <Modal
          ouvert
          titre={edite.id ? 'Modifier l’article' : 'Nouvel article'}
          onFermer={() => setEdite(null)}
          largeur="lg"
          pied={
            <>
              <Button variante="secondaire" onClick={() => setEdite(null)}>
                Annuler
              </Button>
              <Button
                disabled={!edite.valeur.libelle.trim()}
                onClick={() => {
                  if (edite.id) majArticle(edite.id, edite.valeur);
                  else ajouterArticle(edite.valeur);
                  setEdite(null);
                }}
              >
                Enregistrer
              </Button>
            </>
          }
        >
          <FormulaireArticle
            valeur={edite.valeur}
            fournisseurs={data.fournisseurs}
            onChange={(valeur) => setEdite({ ...edite, valeur })}
          />
        </Modal>
      ) : null}

      {/* -------------------------------------------- Formulaire fournisseur */}
      {nouveauFournisseur ? (
        <Modal
          ouvert
          titre="Nouveau fournisseur"
          onFermer={() => setNouveauFournisseur(null)}
          pied={
            <>
              <Button variante="secondaire" onClick={() => setNouveauFournisseur(null)}>
                Annuler
              </Button>
              <Button
                disabled={!nouveauFournisseur.nom.trim()}
                onClick={() => {
                  ajouterFournisseur(nouveauFournisseur);
                  setNouveauFournisseur(null);
                }}
              >
                Enregistrer
              </Button>
            </>
          }
        >
          <div className="grid gap-3">
            <Field label="Nom">
              <Input
                value={nouveauFournisseur.nom}
                onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, nom: e.target.value })}
              />
            </Field>
            <Field label="Contact">
              <Input
                value={nouveauFournisseur.contact}
                onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, contact: e.target.value })}
              />
            </Field>
            <Field label="Téléphone">
              <Input
                value={nouveauFournisseur.telephone}
                onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, telephone: e.target.value })}
              />
            </Field>
            <Field label="Courriel">
              <Input
                value={nouveauFournisseur.email}
                onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, email: e.target.value })}
              />
            </Field>
            <Field label="Note">
              <Input
                value={nouveauFournisseur.note}
                onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, note: e.target.value })}
              />
            </Field>
          </div>
        </Modal>
      ) : null}

      {/* -------------------------------------------------- Bon de commande */}
      {bonAffiche?.fournisseur ? (
        <Modal
          ouvert
          titre={`Bon de commande · ${bonAffiche.fournisseur.nom}`}
          sousTitre={formatDate(new Date().toISOString().slice(0, 10))}
          onFermer={() => setBon(null)}
          largeur="lg"
          pied={
            <>
              <Button variante="secondaire" onClick={() => setBon(null)}>
                Fermer
              </Button>
              <Button onClick={() => window.print()}>Imprimer</Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cabinet</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{data.cabinet.nom}</p>
                <p className="text-sm text-slate-600">{data.cabinet.telephone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fournisseur</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{bonAffiche.fournisseur.nom}</p>
                <p className="text-sm text-slate-600">
                  {[bonAffiche.fournisseur.contact, bonAffiche.fournisseur.telephone, bonAffiche.fournisseur.email]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3">Référence</th>
                  <th className="pb-2 pr-3">Désignation</th>
                  <th className="pb-2 pr-3 text-right">Quantité</th>
                  <th className="pb-2 pr-3 text-right">Prix unitaire</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {bonAffiche.lignes.map((l) => (
                  <tr key={l.article.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 tabular-nums text-slate-600">{l.article.reference || '—'}</td>
                    <td className="py-2 pr-3 text-slate-900">{l.article.libelle}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {l.quantite} {l.article.unite}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">
                      {somme(l.article.prixUnitaire)}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">{somme(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-3 text-right text-sm font-semibold text-slate-700">
                    Total
                  </td>
                  <td className="pt-3 text-right text-base font-bold tabular-nums text-slate-900">
                    {somme(bonAffiche.total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="text-xs leading-relaxed text-slate-500">
              Quantités calculées pour repasser au-dessus du seuil d’alerte, arrondies au
              conditionnement de commande. Ajustez-les avant envoi si nécessaire.
            </p>
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        ouvert={aSupprimer !== null}
        titre="Supprimer cet article ?"
        message={`« ${aSupprimer?.libelle ?? ''} » sera retiré du stock. Cela ne touche à aucun dossier patient.`}
        onConfirmer={() => {
          if (aSupprimer) supprimerArticle(aSupprimer.id);
          setASupprimer(null);
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
