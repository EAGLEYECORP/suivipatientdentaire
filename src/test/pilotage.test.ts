import { describe, expect, it } from 'vitest';
import type { AppData } from '@/types';
import { donneesDemo, donneesVides } from '@/data/seed';
import {
  actesNonFactures,
  chargeParPraticien,
  patientsARappeler,
  repartitionActes,
  santeFinanciere,
  serieMensuelle,
  statistiquesRdv,
  tauxAcceptationDevis,
} from '@/lib/pilotage';

function base(): AppData {
  return donneesVides();
}

describe('série mensuelle', () => {
  it('produit le nombre de mois demandé, du plus ancien au plus récent', () => {
    const s = serieMensuelle(base(), 6, new Date('2026-06-15T12:00:00'));
    expect(s).toHaveLength(6);
    expect(s[0].cle).toBe('2026-01');
    expect(s[5].cle).toBe('2026-06');
  });

  it('ventile facturation et encaissements sur le bon mois', () => {
    const d = base();
    d.factures = [
      {
        id: 'f1',
        numero: 'FA-2026-0001',
        patientId: 'p1',
        date: '2026-03-10',
        lignes: [{ acteId: null, libelle: 'Couronne', quantite: 1, prixUnitaire: 500 }],
        paiements: [
          { id: 'x', date: '2026-03-10', montant: 200, moyen: 'carte', reference: '' },
          { id: 'y', date: '2026-05-02', montant: 300, moyen: 'virement', reference: '' },
        ],
        statut: 'partielle',
        notes: '',
        creeLe: '2026-03-10T00:00:00.000Z',
      },
    ];
    const s = serieMensuelle(d, 6, new Date('2026-06-15T12:00:00'));
    expect(s.find((m) => m.cle === '2026-03')!.facture).toBe(500);
    expect(s.find((m) => m.cle === '2026-03')!.encaisse).toBe(200);
    expect(s.find((m) => m.cle === '2026-05')!.encaisse).toBe(300);
    expect(s.find((m) => m.cle === '2026-04')!.encaisse).toBe(0);
  });

  it('ignore les factures annulées', () => {
    const d = base();
    d.factures = [
      {
        id: 'f1',
        numero: 'FA-2026-0001',
        patientId: 'p1',
        date: '2026-03-10',
        lignes: [{ acteId: null, libelle: 'X', quantite: 1, prixUnitaire: 500 }],
        paiements: [],
        statut: 'annulee',
        notes: '',
        creeLe: '2026-03-10T00:00:00.000Z',
      },
    ];
    expect(serieMensuelle(d, 3, new Date('2026-03-20T12:00:00')).every((m) => m.facture === 0)).toBe(true);
  });
});

describe('acceptation des devis', () => {
  it('ne compte que les devis décidés dans le taux', () => {
    const d = donneesDemo();
    const t = tauxAcceptationDevis(d);
    expect(t.presentes).toBe(1);
    expect(t.enAttente).toBe(1);
    // Aucun devis décidé : le taux ne doit pas être inventé.
    expect(t.taux).toBe(0);
  });

  it('calcule le taux en nombre et en valeur', () => {
    const d = donneesDemo();
    const devis = d.devis[0];
    devis.statut = 'accepte';
    devis.varianteAcceptee = 'var_bridge';
    const t = tauxAcceptationDevis(d);
    expect(t.acceptes).toBe(1);
    expect(t.taux).toBe(100);
    // L'option retenue (1 200 €) rapportée à l'option présentée (1 600 €).
    expect(t.tauxValeur).toBe(75);
  });
});

describe('rendez-vous', () => {
  it('calcule le taux d’absentéisme hors annulations', () => {
    const d = donneesDemo();
    const s = statistiquesRdv(d, new Date(Date.now() - 365 * 86400000));
    expect(s.total).toBeGreaterThan(0);
    expect(s.absents).toBeGreaterThanOrEqual(1);
    expect(s.tauxAbsenteisme).toBeGreaterThan(0);
    expect(s.minutesReservees).toBeGreaterThan(0);
  });

  it('répartit la charge par praticien', () => {
    const d = donneesDemo();
    const depuis = new Date(Date.now() - 30 * 86400000);
    const charge = chargeParPraticien(d, depuis, new Date(Date.now() + 30 * 86400000));
    expect(charge).toHaveLength(d.cabinet.praticiens.length);
    expect(charge.reduce((s, c) => s + c.rendezVous, 0)).toBeGreaterThan(0);
    expect(charge.every((c) => c.occupation >= 0 && c.occupation <= 100)).toBe(true);
  });
});

describe('santé financière', () => {
  it('calcule le taux de recouvrement', () => {
    const s = santeFinanciere(donneesDemo());
    expect(s.factureTotal).toBeGreaterThan(0);
    expect(s.tauxRecouvrement).toBeGreaterThan(0);
    expect(s.tauxRecouvrement).toBeLessThanOrEqual(100);
    expect(s.resteDu).toBe(Math.round((s.factureTotal - s.encaisseTotal) * 100) / 100);
  });

  it('isole les retards de plus de soixante jours', () => {
    const s = santeFinanciere(donneesDemo());
    expect(s.retardLong).toBeGreaterThan(0);
  });

  it('repère les actes réalisés jamais facturés', () => {
    const r = actesNonFactures(donneesDemo());
    expect(r.nombre).toBeGreaterThan(0);
    expect(r.montant).toBeGreaterThan(0);
  });

  it('répartit les actes réalisés par catégorie', () => {
    const r = repartitionActes(donneesDemo());
    expect(r.length).toBeGreaterThan(1);
    // Trié par honoraires décroissants.
    for (let i = 1; i < r.length; i += 1) expect(r[i - 1].montant).toBeGreaterThanOrEqual(r[i].montant);
  });
});

describe('moteur de rappels', () => {
  it('liste les patients dont le contrôle est échu, les plus en retard d’abord', () => {
    const d = base();
    d.patients = [
      {
        ...donneesDemo().patients[0],
        id: 'a',
        rappelMois: 6,
        dernierControle: '2025-01-01',
        actif: true,
      },
      {
        ...donneesDemo().patients[1],
        id: 'b',
        rappelMois: 6,
        dernierControle: '2026-01-01',
        actif: true,
      },
    ];
    const r = patientsARappeler(d, new Date('2026-04-01T12:00:00'));
    expect(r).toHaveLength(1);
    expect(r[0].patient.id).toBe('a');
    expect(r[0].joursDeRetard).toBeGreaterThan(80);
  });

  it('ignore les dossiers inactifs et ceux sans rappel', () => {
    const d = base();
    const modele = donneesDemo().patients[0];
    d.patients = [
      { ...modele, id: 'a', actif: false, rappelMois: 6, dernierControle: '2020-01-01' },
      { ...modele, id: 'b', actif: true, rappelMois: 0, dernierControle: '2020-01-01' },
      { ...modele, id: 'c', actif: true, rappelMois: 6, dernierControle: null },
    ];
    expect(patientsARappeler(d, new Date('2026-04-01T12:00:00'))).toHaveLength(0);
  });

  it('signale les patients déjà reprogrammés pour ne pas les rappeler pour rien', () => {
    const d = base();
    const modele = donneesDemo().patients[0];
    d.patients = [{ ...modele, id: 'a', actif: true, rappelMois: 6, dernierControle: '2025-01-01' }];
    d.rendezVous = [
      {
        id: 'r1',
        patientId: 'a',
        debut: '2026-05-01T09:00:00.000Z',
        duree: 30,
        motif: 'Contrôle',
        praticien: 'Dr Test',
        salle: 'Salle 1',
        statut: 'prevu',
        notes: '',
        rappelEnvoye: false,
        creeLe: '2026-01-01T00:00:00.000Z',
      },
    ];
    const r = patientsARappeler(d, new Date('2026-04-01T12:00:00'));
    expect(r[0].rdvProgramme).toBe(true);
  });
});
