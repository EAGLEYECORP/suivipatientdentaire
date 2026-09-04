import { describe, expect, it } from 'vitest';
import type { Acte, Facture } from '@/types';
import {
  prochainNumeroFacture,
  resteAPayer,
  resumerActes,
  statutCalcule,
  totalFacture,
  totalPaye,
} from '@/lib/finance';

function facture(partiel: Partial<Facture> = {}): Facture {
  return {
    id: 'f1',
    numero: 'FA-2026-0001',
    patientId: 'p1',
    date: '2026-01-10',
    lignes: [
      { acteId: null, libelle: 'Couronne', quantite: 1, prixUnitaire: 500 },
      { acteId: null, libelle: 'Radio', quantite: 2, prixUnitaire: 7.98 },
    ],
    paiements: [],
    statut: 'emise',
    notes: '',
    creeLe: '2026-01-10T09:00:00.000Z',
    ...partiel,
  };
}

function acte(partiel: Partial<Acte> = {}): Acte {
  return {
    id: 'a1',
    patientId: 'p1',
    dents: [26],
    faces: ['O'],
    codeActe: 'HBMD038',
    libelle: 'Obturation 1 face',
    statut: 'planifie',
    tarif: 100,
    baseRemboursement: 30,
    seance: 1,
    praticien: 'Dr Test',
    datePrevue: '2026-02-01',
    dateRealisation: null,
    rdvId: null,
    notes: '',
    creeLe: '2026-01-01T09:00:00.000Z',
    ...partiel,
  };
}

describe('totaux de facture', () => {
  it('additionne les lignes avec leurs quantités', () => {
    expect(totalFacture(facture())).toBe(515.96);
  });

  it('calcule le reste à payer et le borne à zéro', () => {
    const f = facture({
      paiements: [{ id: 'p', date: '2026-01-10', montant: 600, moyen: 'carte', reference: '' }],
    });
    expect(totalPaye(f)).toBe(600);
    expect(resteAPayer(f)).toBe(0);
  });

  it('déduit le statut des règlements', () => {
    expect(statutCalcule(facture())).toBe('emise');
    expect(
      statutCalcule(
        facture({ paiements: [{ id: 'p', date: '2026-01-10', montant: 100, moyen: 'carte', reference: '' }] }),
      ),
    ).toBe('partielle');
    expect(
      statutCalcule(
        facture({ paiements: [{ id: 'p', date: '2026-01-10', montant: 515.96, moyen: 'carte', reference: '' }] }),
      ),
    ).toBe('payee');
  });

  it('laisse intacts les brouillons et les factures annulées', () => {
    expect(statutCalcule(facture({ statut: 'annulee' }))).toBe('annulee');
    expect(statutCalcule(facture({ statut: 'brouillon' }))).toBe('brouillon');
  });
});

describe('numérotation des factures', () => {
  it('repart de 1 chaque année et incrémente ensuite', () => {
    const d = new Date('2026-05-05T10:00:00.000Z');
    expect(prochainNumeroFacture([], d)).toBe('FA-2026-0001');
    expect(prochainNumeroFacture([facture({ numero: 'FA-2026-0009' })], d)).toBe('FA-2026-0010');
    expect(prochainNumeroFacture([facture({ numero: 'FA-2025-0042' })], d)).toBe('FA-2026-0001');
  });
});

describe('synthèse du plan de traitement', () => {
  it('ignore les actes annulés dans les totaux', () => {
    const r = resumerActes([acte(), acte({ id: 'a2', statut: 'annule', tarif: 999, baseRemboursement: 0 })]);
    expect(r.total).toBe(100);
    expect(r.baseRemboursement).toBe(30);
    expect(r.resteACharge).toBe(70);
    expect(r.parStatut.annule).toBe(1);
    expect(r.parStatut.planifie).toBe(1);
  });
});
