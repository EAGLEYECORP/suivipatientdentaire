import { describe, expect, it } from 'vitest';
import {
  NOMENCLATURES,
  actesDe,
  categoriesDe,
  nomenclature,
  regimesDe,
  tauxRegime,
  trouverActeDans,
} from '@/data/nomenclatures';
import { importerJSON } from '@/lib/storage';
import { donneesDemo } from '@/data/seed';

describe('jeux de nomenclature', () => {
  it('propose la France et le Maroc', () => {
    expect(NOMENCLATURES.map((n) => n.id)).toEqual(['ccam-fr', 'ngap-ma']);
  });

  it('retombe sur la première nomenclature pour un identifiant inconnu', () => {
    expect(nomenclature('inexistante').id).toBe('ccam-fr');
  });

  it('livre des actes cohérents dans chaque jeu', () => {
    for (const n of NOMENCLATURES) {
      expect(n.actes.length).toBeGreaterThan(0);
      for (const a of n.actes) {
        expect(a.code).not.toBe('');
        expect(a.libelle).not.toBe('');
        expect(a.tarif).toBeGreaterThanOrEqual(0);
        expect(a.tarifReference).toBeGreaterThanOrEqual(0);
        expect(a.dureeMinutes).toBeGreaterThan(0);
      }
      // Pas de code en double : la sélection serait ambiguë.
      const codes = n.actes.map((a) => a.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it('expose les codes marocains attendus', () => {
    const ma = nomenclature('ngap-ma');
    expect(trouverActeDans('ngap-ma', 'D713')?.libelle).toMatch(/extraction/i);
    expect(trouverActeDans('ngap-ma', 'D708')?.tarifReference).toBe(210);
    expect(trouverActeDans('ngap-ma', 'D754')?.tarifReference).toBe(2250);
    expect(ma.deviseConseillee).toBe('MAD');
  });

  it('porte les taux CNSS et CNOPS', () => {
    expect(tauxRegime('ngap-ma', 'cnss')).toBe(0.7);
    expect(tauxRegime('ngap-ma', 'cnops')).toBe(0.8);
    expect(tauxRegime('ngap-ma', 'aucun')).toBe(0);
  });

  it('retourne un taux nul pour un régime absent ou inconnu', () => {
    expect(tauxRegime('ngap-ma', null)).toBe(0);
    expect(tauxRegime('ngap-ma', 'regime-fantome')).toBe(0);
    expect(tauxRegime('ccam-fr', undefined)).toBe(0);
  });

  it('signale les catalogues non confirmés sur source officielle', () => {
    for (const n of NOMENCLATURES) {
      if (!n.verifiee) expect(n.note.length).toBeGreaterThan(20);
    }
  });

  it('groupe les actes par catégorie', () => {
    expect(categoriesDe('ngap-ma')).toContain('Chirurgie');
    expect(actesDe('ngap-ma').length).toBe(nomenclature('ngap-ma').actes.length);
    expect(regimesDe('ccam-fr').length).toBeGreaterThan(1);
  });
});

describe('migration des sauvegardes antérieures', () => {
  it('reprend l’ancienne base de remboursement comme tarif de référence', () => {
    const ancien = {
      version: 2,
      cabinet: { ...donneesDemo().cabinet, nomenclature: undefined, regimeParDefaut: undefined },
      patients: [{ ...donneesDemo().patients[0], regime: undefined }],
      actes: [{ ...donneesDemo().actes[0], tarifReference: undefined, baseRemboursement: 42 }],
    };
    const migre = importerJSON(JSON.stringify(ancien));

    expect(migre.version).toBe(3);
    expect(migre.actes[0].tarifReference).toBe(42);
    // Les anciennes sauvegardes étaient nécessairement françaises.
    expect(migre.cabinet.nomenclature).toBe('ccam-fr');
    expect(migre.patients[0].regime).toBe(migre.cabinet.regimeParDefaut);
  });

  it('ne touche pas un tarif de référence déjà présent', () => {
    const d = donneesDemo();
    const migre = importerJSON(JSON.stringify(d));
    expect(migre.actes[0].tarifReference).toBe(d.actes[0].tarifReference);
  });
});
