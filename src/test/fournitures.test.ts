import { describe, expect, it } from 'vitest';
import type { ArticleStock, Fournisseur } from '@/types';
import {
  CATALOGUE_DEPART,
  CATEGORIES_FOURNITURE,
  LIBELLE_CATEGORIE_FOURNITURE,
  commandesAPasser,
  quantiteAcommander,
  sousLeSeuil,
  valeurDuStock,
} from '@/data/fournitures';

const art = (p: Partial<ArticleStock>): ArticleStock => ({
  id: 'a',
  libelle: 'Article',
  categorie: 'hygiene',
  unite: 'boîte',
  reference: '',
  stock: 10,
  seuil: 2,
  quantiteCommande: 1,
  prixUnitaire: 0,
  fournisseurId: null,
  ...p,
});

const four = (id: string, nom: string): Fournisseur => ({
  id,
  nom,
  contact: '',
  telephone: '',
  email: '',
  note: '',
});

describe('seuil de réapprovisionnement', () => {
  /* L'égalité compte comme un déclenchement : au seuil, on commande déjà. */
  it('déclenche au seuil et en dessous', () => {
    expect(sousLeSeuil(art({ stock: 3, seuil: 2 }))).toBe(false);
    expect(sousLeSeuil(art({ stock: 2, seuil: 2 }))).toBe(true);
    expect(sousLeSeuil(art({ stock: 0, seuil: 2 }))).toBe(true);
  });

  it('traite un seuil à zéro comme une rupture', () => {
    expect(sousLeSeuil(art({ stock: 1, seuil: 0 }))).toBe(false);
    expect(sousLeSeuil(art({ stock: 0, seuil: 0 }))).toBe(true);
  });
});

describe('quantité à commander', () => {
  it('ne commande rien quand le stock est suffisant', () => {
    expect(quantiteAcommander(art({ stock: 9, seuil: 2 }))).toBe(0);
  });

  it('commande au moins un conditionnement', () => {
    expect(quantiteAcommander(art({ stock: 2, seuil: 4, quantiteCommande: 10 }))).toBe(10);
  });

  /*
   * Le point qui compte : repasser *au-dessus* du seuil, pas l'atteindre.
   * Commander juste de quoi revenir au seuil déclencherait une alerte dès
   * la livraison rangée.
   */
  it('repasse strictement au-dessus du seuil', () => {
    const a = art({ stock: 0, seuil: 10, quantiteCommande: 3 });
    const q = quantiteAcommander(a);
    expect(q).toBe(12);
    expect(a.stock + q).toBeGreaterThan(a.seuil);
  });

  it('arrondit au conditionnement supérieur', () => {
    expect(quantiteAcommander(art({ stock: 1, seuil: 6, quantiteCommande: 4 }))).toBe(8);
  });

  it('supporte un conditionnement absurde sans boucler', () => {
    expect(quantiteAcommander(art({ stock: 0, seuil: 3, quantiteCommande: 0 }))).toBe(4);
  });
});

describe('regroupement des commandes', () => {
  const fournisseurs = [four('f1', 'Atlas'), four('f2', 'Borée')];

  it('ne retient que les articles sous le seuil', () => {
    const c = commandesAPasser(
      [
        art({ id: '1', stock: 1, seuil: 3, fournisseurId: 'f1' }),
        art({ id: '2', stock: 20, seuil: 3, fournisseurId: 'f1' }),
      ],
      fournisseurs,
    );
    expect(c).toHaveLength(1);
    expect(c[0].lignes.map((l) => l.article.id)).toEqual(['1']);
  });

  it('regroupe par fournisseur et calcule le total', () => {
    const c = commandesAPasser(
      [
        art({ id: '1', libelle: 'B', stock: 0, seuil: 1, quantiteCommande: 2, prixUnitaire: 50, fournisseurId: 'f1' }),
        art({ id: '2', libelle: 'A', stock: 0, seuil: 1, quantiteCommande: 3, prixUnitaire: 10, fournisseurId: 'f1' }),
        art({ id: '3', stock: 0, seuil: 1, quantiteCommande: 1, prixUnitaire: 7, fournisseurId: 'f2' }),
      ],
      fournisseurs,
    );
    expect(c).toHaveLength(2);
    const atlas = c.find((x) => x.fournisseur?.id === 'f1')!;
    expect(atlas.total).toBe(2 * 50 + 3 * 10);
    /* Lignes triées par désignation, pour un bon de commande lisible. */
    expect(atlas.lignes.map((l) => l.article.libelle)).toEqual(['A', 'B']);
  });

  /*
   * Les articles orphelins doivent rester visibles : les écarter
   * silencieusement ferait disparaître du bon de commande ce que le
   * praticien a justement oublié de rattacher.
   */
  it('rassemble les articles sans fournisseur dans un lot à part', () => {
    const c = commandesAPasser([art({ id: '1', stock: 0, seuil: 1, fournisseurId: null })], fournisseurs);
    expect(c).toHaveLength(1);
    expect(c[0].fournisseur).toBeNull();
    expect(c[0].lignes).toHaveLength(1);
  });

  it('détache plutôt que de perdre un article dont le fournisseur a disparu', () => {
    const c = commandesAPasser([art({ id: '1', stock: 0, seuil: 1, fournisseurId: 'supprime' })], fournisseurs);
    expect(c[0].fournisseur).toBeNull();
  });

  it('ne rend rien quand tout est au-dessus du seuil', () => {
    expect(commandesAPasser([art({ stock: 99, seuil: 1 })], fournisseurs)).toEqual([]);
  });
});

describe('valeur du stock', () => {
  it('multiplie les quantités par leur prix', () => {
    expect(valeurDuStock([art({ stock: 3, prixUnitaire: 10 }), art({ stock: 2, prixUnitaire: 5.5 })])).toBe(41);
  });

  it('vaut zéro sur un stock vide', () => {
    expect(valeurDuStock([])).toBe(0);
  });
});

describe('catalogue de départ', () => {
  it('n’emploie que des catégories connues', () => {
    for (const m of CATALOGUE_DEPART) {
      expect(CATEGORIES_FOURNITURE, m.libelle).toContain(m.categorie);
      expect(LIBELLE_CATEGORIE_FOURNITURE[m.categorie]).toBeTruthy();
    }
  });

  it('donne un conditionnement utilisable à chaque modèle', () => {
    for (const m of CATALOGUE_DEPART) {
      expect(m.quantiteCommande, m.libelle).toBeGreaterThan(0);
      expect(m.unite.trim().length).toBeGreaterThan(0);
    }
  });

  it('ne répète pas une désignation', () => {
    expect(new Set(CATALOGUE_DEPART.map((m) => m.libelle)).size).toBe(CATALOGUE_DEPART.length);
  });
});
