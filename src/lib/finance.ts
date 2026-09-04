import type { Acte, Facture } from '@/types';
import { arrondi2 } from '@/lib/utils';

export function totalFacture(f: Facture): number {
  return arrondi2(f.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0));
}

export function totalPaye(f: Facture): number {
  return arrondi2(f.paiements.reduce((s, p) => s + p.montant, 0));
}

export function resteAPayer(f: Facture): number {
  return arrondi2(Math.max(0, totalFacture(f) - totalPaye(f)));
}

/** Derives the invoice status from its payments; cancelled invoices are left alone. */
export function statutCalcule(f: Facture): Facture['statut'] {
  if (f.statut === 'annulee' || f.statut === 'brouillon') return f.statut;
  const total = totalFacture(f);
  const paye = totalPaye(f);
  if (total > 0 && paye >= total) return 'payee';
  if (paye > 0) return 'partielle';
  return 'emise';
}

export interface ResumeDevis {
  total: number;
  baseRemboursement: number;
  resteACharge: number;
  parStatut: Record<Acte['statut'], number>;
}

/** Aggregates a treatment plan: total fees, reimbursable base and out-of-pocket. */
export function resumerActes(actes: Acte[]): ResumeDevis {
  const parStatut: ResumeDevis['parStatut'] = { planifie: 0, en_cours: 0, realise: 0, annule: 0 };
  let total = 0;
  let base = 0;
  for (const a of actes) {
    parStatut[a.statut] += 1;
    if (a.statut === 'annule') continue;
    total += a.tarif;
    base += a.baseRemboursement;
  }
  return {
    total: arrondi2(total),
    baseRemboursement: arrondi2(base),
    resteACharge: arrondi2(Math.max(0, total - base)),
    parStatut,
  };
}

/** Sequential invoice number scoped to the current year, e.g. FA-2026-0007. */
export function prochainNumeroFacture(factures: Facture[], date = new Date()): string {
  const annee = date.getFullYear();
  const prefixe = `FA-${annee}-`;
  const max = factures
    .filter((f) => f.numero.startsWith(prefixe))
    .map((f) => Number.parseInt(f.numero.slice(prefixe.length), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((m, n) => Math.max(m, n), 0);
  return `${prefixe}${String(max + 1).padStart(4, '0')}`;
}
