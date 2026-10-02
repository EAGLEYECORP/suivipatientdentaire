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

describe('coffre et magasin', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('écrit une enveloppe scellée, illisible sans la phrase', async () => {
    const { creerCoffre, ouvrirCoffre } = await import('@/lib/crypto');
    const { lireEnveloppe, ouvrirEnveloppe, sauvegarderChiffre } = await import('@/lib/storage');

    const data = donneesDemo();
    const coffre = await creerCoffre('phrase du cabinet 2026');
    await sauvegarderChiffre(data, coffre);

    // Sur le disque : aucun nom de patient en clair.
    const brut = localStorage.getItem('suivi-patient-dentaire:v1')!;
    expect(brut).not.toContain(data.patients[0].nom);

    // La lecture simple ne rend rien : il faut ouvrir le coffre.
    const enveloppe = lireEnveloppe();
    expect(enveloppe.etat).toBe('chiffre');
    expect(charger()).toBeNull();

    if (enveloppe.etat !== 'chiffre') throw new Error('enveloppe inattendue');
    const rouvert = await ouvrirCoffre('phrase du cabinet 2026', enveloppe.enveloppe.sel);
    const relu = await ouvrirEnveloppe(enveloppe.enveloppe, rouvert);
    expect(relu.patients).toHaveLength(data.patients.length);
    expect(relu.journal.length).toBeGreaterThan(0);
  });

  it('refuse d’ouvrir avec une mauvaise phrase', async () => {
    const { creerCoffre, ouvrirCoffre } = await import('@/lib/crypto');
    const { lireEnveloppe, ouvrirEnveloppe, sauvegarderChiffre } = await import('@/lib/storage');

    await sauvegarderChiffre(donneesDemo(), await creerCoffre('bonne phrase'));
    const enveloppe = lireEnveloppe();
    if (enveloppe.etat !== 'chiffre') throw new Error('enveloppe inattendue');
    const faux = await ouvrirCoffre('mauvaise phrase', enveloppe.enveloppe.sel);
    await expect(ouvrirEnveloppe(enveloppe.enveloppe, faux)).rejects.toThrow();
  });

  it('migre une sauvegarde v1 sans perdre de données', () => {
    const ancien = {
      version: 1,
      cabinet: donneesDemo().cabinet,
      patients: [
        {
          id: 'p1',
          nom: 'Ancien',
          prenom: 'Dossier',
          dateNaissance: '1980-01-01',
          sexe: 'F',
          telephone: '0600000000',
          email: '',
          adresse: '',
          numeroSecu: '',
          mutuelle: '',
          medecinTraitant: '',
          allergies: ['Pénicilline'],
          notes: '',
          creeLe: '2024-01-01T00:00:00.000Z',
          majLe: '2024-01-01T00:00:00.000Z',
          actif: true,
        },
      ],
    };
    const migre = importerJSON(JSON.stringify(ancien));
    expect(migre.version).toBe(3);
    expect(migre.patients[0].allergies).toEqual(['Pénicilline']);
    // Les champs nouveaux reçoivent des valeurs sûres.
    expect(migre.patients[0].facteursRisque.tabac).toBe('non');
    expect(migre.patients[0].rappelMois).toBe(6);
    expect(migre.journal).toEqual([]);
    expect(migre.chartingsParo).toEqual([]);
  });
});
