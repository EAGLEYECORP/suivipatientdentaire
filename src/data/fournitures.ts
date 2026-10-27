import type { ArticleStock, CategorieFourniture, Fournisseur } from '@/types';

/**
 * Consommables du cabinet.
 *
 * Le catalogue de départ ne nomme **aucune marque et aucun fournisseur** :
 * ce sont des désignations génériques, que chaque cabinet remplace par ses
 * propres références. Inventer des fournisseurs et des prix aurait produit
 * des données fausses présentées comme un service.
 */

export const LIBELLE_CATEGORIE_FOURNITURE: Record<CategorieFourniture, string> = {
  hygiene: 'Hygiène et protection',
  anesthesie: 'Anesthésie',
  restauration: 'Restauration',
  endodontie: 'Endodontie',
  chirurgie: 'Chirurgie',
  prothese: 'Prothèse et empreinte',
  imagerie: 'Imagerie',
  cabinet: 'Cabinet et stérilisation',
};

export const CATEGORIES_FOURNITURE = Object.keys(
  LIBELLE_CATEGORIE_FOURNITURE,
) as CategorieFourniture[];

export const UNITES = ['boîte', 'flacon', 'sachet', 'unité', 'rouleau', 'seringue', 'paquet'];

interface ModeleArticle {
  libelle: string;
  categorie: CategorieFourniture;
  unite: string;
  quantiteCommande: number;
}

/** Trame de départ, à ajuster par le cabinet. */
export const CATALOGUE_DEPART: ModeleArticle[] = [
  { libelle: 'Gants nitrile non poudrés, taille M', categorie: 'hygiene', unite: 'boîte', quantiteCommande: 10 },
  { libelle: 'Masques chirurgicaux type IIR', categorie: 'hygiene', unite: 'boîte', quantiteCommande: 5 },
  { libelle: 'Champs de soin jetables', categorie: 'hygiene', unite: 'paquet', quantiteCommande: 4 },
  { libelle: 'Solution de désinfection des surfaces', categorie: 'hygiene', unite: 'flacon', quantiteCommande: 6 },
  { libelle: 'Articaïne 4 % adrénalinée 1/100 000', categorie: 'anesthesie', unite: 'boîte', quantiteCommande: 4 },
  { libelle: 'Aiguilles pour anesthésie 30G courtes', categorie: 'anesthesie', unite: 'boîte', quantiteCommande: 3 },
  { libelle: 'Composite photopolymérisable, teinte A2', categorie: 'restauration', unite: 'seringue', quantiteCommande: 5 },
  { libelle: 'Adhésif universel', categorie: 'restauration', unite: 'flacon', quantiteCommande: 2 },
  { libelle: 'Acide orthophosphorique 37 %', categorie: 'restauration', unite: 'seringue', quantiteCommande: 3 },
  { libelle: 'Matrices métalliques sectorielles', categorie: 'restauration', unite: 'boîte', quantiteCommande: 2 },
  { libelle: 'Limes endodontiques rotatives, assortiment', categorie: 'endodontie', unite: 'boîte', quantiteCommande: 2 },
  { libelle: 'Hypochlorite de sodium 2,5 %', categorie: 'endodontie', unite: 'flacon', quantiteCommande: 4 },
  { libelle: 'Cônes de gutta-percha, assortiment', categorie: 'endodontie', unite: 'boîte', quantiteCommande: 2 },
  { libelle: 'Fil de suture résorbable 4/0', categorie: 'chirurgie', unite: 'boîte', quantiteCommande: 2 },
  { libelle: 'Compresses stériles', categorie: 'chirurgie', unite: 'paquet', quantiteCommande: 10 },
  { libelle: 'Silicone d’empreinte, base et catalyseur', categorie: 'prothese', unite: 'boîte', quantiteCommande: 2 },
  { libelle: 'Porte-empreintes jetables, assortiment', categorie: 'prothese', unite: 'paquet', quantiteCommande: 3 },
  { libelle: 'Capteurs jetables de protection radio', categorie: 'imagerie', unite: 'boîte', quantiteCommande: 2 },
  { libelle: 'Sachets de stérilisation autoscellants', categorie: 'cabinet', unite: 'boîte', quantiteCommande: 6 },
  { libelle: 'Rouleaux pour aspiration chirurgicale', categorie: 'cabinet', unite: 'rouleau', quantiteCommande: 4 },
];

/** Un article dont le stock est tombé au seuil ou en dessous. */
export function sousLeSeuil(a: ArticleStock): boolean {
  return a.stock <= a.seuil;
}

/** Quantité à commander pour repasser au-dessus du seuil. */
export function quantiteAcommander(a: ArticleStock): number {
  if (!sousLeSeuil(a)) return 0;
  const manque = a.seuil - a.stock + 1;
  const parLot = Math.max(1, a.quantiteCommande);
  return Math.max(parLot, Math.ceil(manque / parLot) * parLot);
}

export interface LigneCommande {
  article: ArticleStock;
  quantite: number;
  total: number;
}

export interface CommandeFournisseur {
  fournisseur: Fournisseur | null;
  lignes: LigneCommande[];
  total: number;
}

/**
 * Regroupe les articles à recommander par fournisseur.
 *
 * Les articles sans fournisseur ne sont pas écartés : ils forment un lot à
 * part, pour que le praticien voie ce qu'il doit encore rattacher plutôt
 * que de les perdre silencieusement.
 */
export function commandesAPasser(
  stock: ArticleStock[],
  fournisseurs: Fournisseur[],
): CommandeFournisseur[] {
  const parFournisseur = new Map<string, LigneCommande[]>();

  for (const article of stock) {
    const quantite = quantiteAcommander(article);
    if (quantite === 0) continue;
    const cle = article.fournisseurId ?? '';
    const lignes = parFournisseur.get(cle) ?? [];
    lignes.push({ article, quantite, total: quantite * article.prixUnitaire });
    parFournisseur.set(cle, lignes);
  }

  return [...parFournisseur.entries()]
    .map(([cle, lignes]) => ({
      fournisseur: fournisseurs.find((f) => f.id === cle) ?? null,
      lignes: [...lignes].sort((a, b) => a.article.libelle.localeCompare(b.article.libelle, 'fr')),
      total: lignes.reduce((n, l) => n + l.total, 0),
    }))
    .sort((a, b) => (a.fournisseur?.nom ?? 'zzz').localeCompare(b.fournisseur?.nom ?? 'zzz', 'fr'));
}

/** Valeur du stock détenu, pour le pilotage. */
export function valeurDuStock(stock: ArticleStock[]): number {
  return stock.reduce((n, a) => n + a.stock * a.prixUnitaire, 0);
}
