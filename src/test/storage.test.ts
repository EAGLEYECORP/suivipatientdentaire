import { beforeEach, describe, expect, it } from 'vitest';
import { CLE_STOCKAGE, charger, effacer, exporterJSON, importerJSON, sauvegarder } from '@/lib/storage';
import { donneesDemo, donneesVides } from '@/data/seed';

describe('persistance locale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retourne null quand rien n’est stocké', () => {
    expect(charger()).toBeNull();
  });

  it('fait un aller-retour complet', () => {
    const data = donneesDemo();
    sauvegarder(data);
    const relu = charger();
    expect(relu).not.toBeNull();
    expect(relu?.patients).toHaveLength(data.patients.length);
    expect(relu?.cabinet.nom).toBe(data.cabinet.nom);
  });

  it('ignore un contenu corrompu', () => {
    localStorage.setItem(CLE_STOCKAGE, '{ pas du json');
    expect(charger()).toBeNull();
  });

  it('efface le stockage', () => {
    sauvegarder(donneesVides());
    effacer();
    expect(charger()).toBeNull();
  });

  it('valide les fichiers importés', () => {
    const json = exporterJSON(donneesDemo());
    expect(importerJSON(json).patients.length).toBeGreaterThan(0);
    expect(() => importerJSON('{"patients":[]}')).toThrow(/cabinet/i);
    expect(() => importerJSON('{"cabinet":{}}')).toThrow(/patients/i);
  });
});

describe('jeu de démonstration', () => {
  it('est cohérent : chaque référence pointe sur un patient existant', () => {
    const d = donneesDemo();
    const ids = new Set(d.patients.map((p) => p.id));
    expect(d.patients.length).toBeGreaterThan(0);
    for (const collection of [d.actes, d.rendezVous, d.factures, d.notes, d.odontogrammes]) {
      for (const item of collection) expect(ids.has(item.patientId)).toBe(true);
    }
  });

  it('affecte une dentition temporaire aux jeunes enfants', () => {
    const d = donneesDemo();
    for (const o of d.odontogrammes) {
      const p = d.patients.find((x) => x.id === o.patientId)!;
      const ans = new Date().getFullYear() - new Date(p.dateNaissance).getFullYear();
      if (ans < 7) expect(o.dentition).toBe('temporaire');
    }
  });
});
