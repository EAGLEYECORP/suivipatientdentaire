import { describe, expect, it } from 'vitest';
import type { ChartingParo, DentPerio, SitePerio } from '@/types';
import {
  SITES_PERIO,
  auMoinsDeuxNonAdjacentes,
  cal,
  calculerIndices,
  dentPerioVide,
  diagnostiquer,
  estPluriradiculee,
  perteAttache,
  sontAdjacentes,
} from '@/data/perio';
import { ARCADE_INF_PERM, ARCADE_SUP_PERM } from '@/data/teeth';

interface Reglage {
  pd?: number;
  rec?: number;
  bop?: boolean;
  plaque?: boolean;
}

function charting(reglages: Reglage = {}, surcharges: Record<number, Reglage> = {}): ChartingParo {
  const dents: DentPerio[] = [...ARCADE_SUP_PERM, ...ARCADE_INF_PERM].map((numero) => {
    const d = dentPerioVide(numero);
    const r = { pd: 2, rec: 0, bop: false, plaque: false, ...reglages, ...(surcharges[numero] ?? {}) };
    for (const s of SITES_PERIO) {
      d.sites[s] = { pd: r.pd, rec: r.rec, bop: r.bop, plaque: r.plaque, pus: false };
    }
    return d;
  });
  return {
    id: 'c1',
    patientId: 'p1',
    date: '2026-03-01T09:00:00.000Z',
    praticien: 'Dr Test',
    dents,
    perteOsseusePct: null,
    fumeur: 'non',
    diabete: 'non',
    notes: '',
  };
}

describe('mesures parodontales', () => {
  it('calcule le niveau d’attache clinique', () => {
    expect(cal({ pd: 4, rec: 2, bop: true, plaque: false, pus: false })).toBe(6);
    expect(cal({ pd: 3, rec: null, bop: false, plaque: false, pus: false })).toBe(3);
    expect(cal({ pd: null, rec: 2, bop: false, plaque: false, pus: false })).toBeNull();
  });

  it('identifie les dents pluriradiculées sondables en furcation', () => {
    expect(estPluriradiculee(16)).toBe(true);
    expect(estPluriradiculee(46)).toBe(true);
    expect(estPluriradiculee(13)).toBe(false);
    expect(estPluriradiculee(15)).toBe(false);
  });

  it('agrège les indices sur l’ensemble de la bouche', () => {
    const i = calculerIndices(charting({ pd: 5, rec: 1, bop: true, plaque: true }));
    expect(i.sitesSondes).toBe(32 * 6);
    expect(i.bopPct).toBe(100);
    expect(i.plaquePct).toBe(100);
    expect(i.pdMax).toBe(5);
    expect(i.calMax).toBe(6);
    expect(i.poches4Pct).toBe(100);
    expect(i.poches6Pct).toBe(0);
  });

  it('ne compte que les sites réellement sondés', () => {
    const c = charting();
    for (const s of SITES_PERIO) c.dents[0].sites[s] = { pd: null, rec: null, bop: false, plaque: false, pus: false };
    expect(calculerIndices(c).sitesSondes).toBe(31 * 6);
    expect(calculerIndices(c).dentsSondees).toBe(31);
  });
});

describe('classification 2018 (AAP/EFP)', () => {
  it('conclut à un parodonte sain sans perte d’attache ni saignement', () => {
    const d = diagnostiquer(charting({ pd: 2, rec: 0, bop: false }), 40, []);
    expect(d.gingiviteSeule).toBe(true);
    expect(d.libelle).toMatch(/sain/i);
    expect(d.stabilite).toBe('stable');
  });

  it('distingue gingivite localisée et généralisée', () => {
    const peu: Record<number, Reglage> = {
      16: { bop: true },
      26: { bop: true },
      36: { bop: true },
      46: { bop: true },
    };
    expect(diagnostiquer(charting({ bop: false }, peu), 30, []).libelle).toBe('Gingivite localisée');
    expect(diagnostiquer(charting({ bop: true }), 30, []).libelle).toBe('Gingivite généralisée');
  });

  it('classe un stade I sur une perte d’attache interdentaire de 1 à 2 mm', () => {
    const d = diagnostiquer(charting({ pd: 1, rec: 1, bop: true }), 45, []);
    expect(d.gingiviteSeule).toBe(false);
    expect(d.stade).toBe('I');
    expect(d.libelle).toContain('stade I');
  });

  it('classe un stade II entre 3 et 4 mm de perte d’attache', () => {
    expect(diagnostiquer(charting({ pd: 2, rec: 1, bop: true }), 45, []).stade).toBe('II');
  });

  it('passe en stade III au-delà de 5 mm, ou sur une poche ≥ 6 mm', () => {
    expect(diagnostiquer(charting({ pd: 3, rec: 2, bop: true }), 45, []).stade).toBe('III');
    const pocheProfonde = diagnostiquer(charting({ pd: 6, rec: 0, bop: true }), 45, []);
    expect(pocheProfonde.stade).toBe('III');
    expect(pocheProfonde.justifications.join(' ')).toMatch(/6 mm/);
  });

  it('passe en stade IV quand la réhabilitation devient complexe', () => {
    expect(diagnostiquer(charting({ pd: 2, rec: 1, bop: true }), 60, [17, 27, 37, 47, 36, 46]).stade).toBe('IV');
  });

  it('déduit le grade du rapport perte osseuse / âge', () => {
    const lent = charting({ pd: 2, rec: 1, bop: true });
    lent.perteOsseusePct = 10;
    expect(diagnostiquer(lent, 60, []).grade).toBe('A');

    const rapide = charting({ pd: 2, rec: 1, bop: true });
    rapide.perteOsseusePct = 50;
    expect(diagnostiquer(rapide, 35, []).grade).toBe('C');
  });

  it('aggrave le grade pour un gros fumeur ou un diabète déséquilibré', () => {
    const fumeur = charting({ pd: 2, rec: 1, bop: true });
    fumeur.perteOsseusePct = 10;
    fumeur.fumeur = 'dix_ou_plus';
    const d = diagnostiquer(fumeur, 60, []);
    expect(d.grade).toBe('C');
    expect(d.justifications.join(' ')).toMatch(/Tabagisme/);

    const diabetique = charting({ pd: 2, rec: 1, bop: true });
    diabetique.diabete = 'desequilibre';
    expect(diagnostiquer(diabetique, 50, []).grade).toBe('C');
  });

  it('qualifie l’étendue selon la proportion de dents atteintes', () => {
    const quelques: Record<number, Reglage> = { 16: { rec: 2 }, 26: { rec: 2 } };
    expect(diagnostiquer(charting({ pd: 2, rec: 0 }, quelques), 50, []).etendue).toBe('localisee');
    expect(diagnostiquer(charting({ pd: 2, rec: 2 }), 50, []).etendue).toBe('generalisee');
  });

  it('juge la stabilité après traitement', () => {
    const traite = charting({ pd: 2, rec: 2, bop: false });
    expect(diagnostiquer(traite, 50, []).stabilite).toBe('stable');
    const actif = charting({ pd: 5, rec: 2, bop: true });
    expect(diagnostiquer(actif, 50, []).stabilite).toBe('instable');
  });

  it('refuse de conclure sans sondage', () => {
    const vide = charting();
    for (const d of vide.dents) {
      for (const s of SITES_PERIO as SitePerio[]) {
        d.sites[s] = { pd: null, rec: null, bop: false, plaque: false, pus: false };
      }
    }
    const diag = diagnostiquer(vide, 40, []);
    expect(diag.stade).toBeNull();
    expect(diag.stabilite).toBe('non_evaluable');
    expect(diag.libelle).toMatch(/non calculable/i);
  });

  it('restitue toujours le raisonnement au praticien', () => {
    const d = diagnostiquer(charting({ pd: 4, rec: 2, bop: true }), 45, []);
    expect(d.justifications.length).toBeGreaterThan(2);
    expect(d.justifications.join(' ')).toMatch(/Perte d'attache interdentaire/);
  });
});

describe('distinction sulcus sain / perte d’attache', () => {
  it('ne compte aucune perte sur un sulcus physiologique', () => {
    expect(perteAttache({ pd: 3, rec: 0, bop: false, plaque: false, pus: false })).toBe(0);
    expect(perteAttache({ pd: 2, rec: 0, bop: false, plaque: false, pus: false })).toBe(0);
  });

  it('compte la poche au-delà du sulcus physiologique', () => {
    expect(perteAttache({ pd: 5, rec: 0, bop: true, plaque: false, pus: false })).toBe(2);
  });

  it('additionne poche et récession dès que la marge est apicale à la JEC', () => {
    expect(perteAttache({ pd: 4, rec: 2, bop: true, plaque: false, pus: false })).toBe(6);
  });

  it('tient compte d’une marge coronaire à la JEC', () => {
    expect(perteAttache({ pd: 4, rec: -2, bop: false, plaque: false, pus: false })).toBe(0);
    expect(cal({ pd: 4, rec: -2, bop: false, plaque: false, pus: false })).toBe(2);
  });
});

describe('adjacence des dents', () => {
  it('reconnaît les dents voisines dans un quadrant', () => {
    expect(sontAdjacentes(16, 15)).toBe(true);
    expect(sontAdjacentes(16, 14)).toBe(false);
  });

  it('traite les incisives centrales comme voisines à travers la ligne médiane', () => {
    expect(sontAdjacentes(11, 21)).toBe(true);
    expect(sontAdjacentes(31, 41)).toBe(true);
    expect(sontAdjacentes(12, 22)).toBe(false);
  });

  it('exige deux dents non adjacentes pour la définition de cas', () => {
    expect(auMoinsDeuxNonAdjacentes([16, 15])).toBe(false);
    expect(auMoinsDeuxNonAdjacentes([16, 26])).toBe(true);
    expect(auMoinsDeuxNonAdjacentes([16])).toBe(false);
  });

  it('ne diagnostique pas une parodontite sur deux dents adjacentes seulement', () => {
    const voisines: Record<number, Reglage> = { 16: { pd: 4, rec: 2 }, 15: { pd: 4, rec: 2 } };
    const d = diagnostiquer(charting({ pd: 2, rec: 0 }, voisines), 45, []);
    expect(d.gingiviteSeule).toBe(true);
    expect(d.justifications.join(' ')).toMatch(/adjacentes/);
  });
});

describe('dents absentes', () => {
  it('exclut les dents absentes des indices', () => {
    const c = charting({ pd: 6, rec: 2, bop: true });
    const complet = calculerIndices(c);
    const partiel = calculerIndices(c, [16, 26, 36, 46]);
    expect(complet.sitesSondes).toBe(32 * 6);
    expect(partiel.sitesSondes).toBe(28 * 6);
    expect(partiel.dentsSondees).toBe(28);
  });

  it('ne laisse pas une dent absente peser sur le diagnostic', () => {
    // Seules deux molaires sont atteintes ; si on les retire de la bouche,
    // il ne reste plus de parodontite.
    const atteintes: Record<number, Reglage> = { 16: { pd: 6, rec: 3 }, 46: { pd: 6, rec: 3 } };
    const c = charting({ pd: 2, rec: 0 }, atteintes);
    expect(diagnostiquer(c, 50, []).gingiviteSeule).toBe(false);
    expect(diagnostiquer(c, 50, [16, 46]).gingiviteSeule).toBe(true);
  });

  it('compte les dents absentes dans la complexité du stade IV', () => {
    const c = charting({ pd: 2, rec: 1, bop: true });
    expect(diagnostiquer(c, 55, [18, 28, 38]).stade).not.toBe('IV');
    expect(diagnostiquer(c, 55, [18, 28, 38, 48, 17]).stade).toBe('IV');
  });
});
