import { describe, expect, it } from 'vitest';
import { contourCouronne, dimensions, disposerArcades, placerArcade, sillons } from '@/data/anatomie';
import { ARCADE_SUP_PERM, arcades, toutesLesDents } from '@/data/teeth';

describe('dimensions coronaires', () => {
  it('donne aux molaires une couronne plus large qu’aux incisives', () => {
    expect(dimensions(36).md).toBeGreaterThan(dimensions(31).md);
    expect(dimensions(16).md).toBeGreaterThan(dimensions(12).md);
  });

  it('respecte l’asymétrie maxillaire / mandibulaire', () => {
    // L'incisive centrale maxillaire est nettement plus large que la mandibulaire.
    expect(dimensions(11).md).toBeGreaterThan(dimensions(41).md);
    // La première molaire mandibulaire est la plus large de la bouche.
    expect(dimensions(36).md).toBeGreaterThan(dimensions(16).md);
  });

  it('est symétrique entre les deux côtés', () => {
    expect(dimensions(16)).toEqual(dimensions(26));
    expect(dimensions(43)).toEqual(dimensions(33));
  });

  it('couvre la denture temporaire', () => {
    expect(dimensions(54).md).toBeGreaterThan(0);
    expect(dimensions(54).md).toBeLessThan(dimensions(14).md + 3);
  });
});

describe('disposition sur l’arcade', () => {
  it('place toutes les dents des deux dentitions', () => {
    const perm = disposerArcades('permanente');
    expect(perm.haut).toHaveLength(16);
    expect(perm.bas).toHaveLength(16);
    const temp = disposerArcades('temporaire');
    expect(temp.haut).toHaveLength(10);
    expect(temp.bas).toHaveLength(10);
    expect(toutesLesDents('permanente')).toHaveLength(32);
  });

  it('ordonne les dents de la droite du patient vers sa gauche', () => {
    const { haut } = disposerArcades('permanente');
    for (let i = 1; i < haut.length; i += 1) {
      expect(haut[i].x).toBeGreaterThan(haut[i - 1].x);
    }
    expect(haut[0].numero).toBe(18);
    expect(haut[haut.length - 1].numero).toBe(28);
  });

  it('est symétrique par rapport à la ligne médiane', () => {
    const { haut } = disposerArcades('permanente');
    const d11 = haut.find((p) => p.numero === 11)!;
    const d21 = haut.find((p) => p.numero === 21)!;
    expect(d11.x).toBeCloseTo(-d21.x, 6);
    expect(d11.y).toBeCloseTo(d21.y, 6);
    expect(d11.rotation).toBeCloseTo(-d21.rotation, 6);
  });

  it('courbe l’arcade : les molaires sont plus reculées que les incisives', () => {
    const { haut, bas } = disposerArcades('permanente');
    const incisive = haut.find((p) => p.numero === 11)!;
    const molaire = haut.find((p) => p.numero === 18)!;
    // Arcade maxillaire ouverte vers le bas : les incisives sont en haut.
    expect(molaire.y).toBeGreaterThan(incisive.y);

    const incisiveBas = bas.find((p) => p.numero === 41)!;
    const molaireBas = bas.find((p) => p.numero === 48)!;
    expect(molaireBas.y).toBeLessThan(incisiveBas.y);
  });

  it('sépare les deux arcades sans les faire se croiser', () => {
    const { haut, bas } = disposerArcades('permanente');
    const basDuHaut = Math.max(...haut.map((p) => p.y));
    const hautDuBas = Math.min(...bas.map((p) => p.y));
    expect(hautDuBas).toBeGreaterThan(basDuHaut - 1);
  });

  it('ne superpose pas deux couronnes voisines', () => {
    const { haut } = disposerArcades('permanente');
    for (let i = 1; i < haut.length; i += 1) {
      const a = haut[i - 1];
      const b = haut[i];
      const ecart = Math.hypot(b.x - a.x, b.y - a.y);
      const requis = (a.dimensions.md + b.dimensions.md) / 2;
      // Tolérance de 15 % : les couronnes suivent une courbe, pas une droite.
      expect(ecart).toBeGreaterThan(requis * 0.85);
    }
  });

  it('fait pivoter les dents postérieures plus que les antérieures', () => {
    const { haut } = disposerArcades('permanente');
    const centrale = haut.find((p) => p.numero === 21)!;
    const molaire = haut.find((p) => p.numero === 27)!;
    expect(Math.abs(molaire.rotation)).toBeGreaterThan(Math.abs(centrale.rotation));
  });

  it('calcule une boîte englobante qui contient toutes les dents', () => {
    const { haut, bas, boite } = disposerArcades('permanente');
    for (const p of [...haut, ...bas]) {
      expect(p.x).toBeGreaterThan(boite.x);
      expect(p.x).toBeLessThan(boite.x + boite.largeur);
      expect(p.y).toBeGreaterThan(boite.y);
      expect(p.y).toBeLessThan(boite.y + boite.hauteur);
    }
    expect(boite.largeur).toBeGreaterThan(0);
    expect(boite.hauteur).toBeGreaterThan(0);
  });

  it('place une arcade temporaire plus petite que la permanente', () => {
    const perm = disposerArcades('permanente');
    const temp = disposerArcades('temporaire');
    expect(temp.boite.largeur).toBeLessThan(perm.boite.largeur);
  });

  it('expose un placement utilisable pour une demi-arcade isolée', () => {
    const p = placerArcade(ARCADE_SUP_PERM, true);
    expect(p).toHaveLength(16);
    expect(p.every((x) => Number.isFinite(x.x) && Number.isFinite(x.y))).toBe(true);
    expect(arcades('permanente').haut).toEqual(ARCADE_SUP_PERM);
  });
});

describe('silhouettes coronaires', () => {
  it('produit un chemin fermé pour chaque dent', () => {
    for (const n of toutesLesDents('permanente')) {
      const d = contourCouronne(n, dimensions(n));
      expect(d.startsWith('M')).toBe(true);
      expect(d.trim().endsWith('Z')).toBe(true);
      expect(d).not.toMatch(/NaN/);
    }
  });

  it('dessine des sillons adaptés au type de dent', () => {
    expect(sillons(16, dimensions(16)).length).toBeGreaterThan(1);
    expect(sillons(11, dimensions(11))).toHaveLength(1);
    expect(sillons(18, dimensions(18)).length).toBeGreaterThan(0);
    for (const n of toutesLesDents('temporaire')) {
      expect(sillons(n, dimensions(n)).join(' ')).not.toMatch(/NaN/);
    }
  });
});
