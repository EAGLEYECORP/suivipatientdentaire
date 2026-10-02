import type { AppData, Patient } from '@/types';
import { resteAPayer, totalFacture, totalPaye } from '@/lib/finance';
import { arrondi2 } from '@/lib/utils';
import { trouverActe } from '@/data/actes';

/**
 * Indicateurs de pilotage du cabinet. Toutes les fonctions sont pures et
 * datées explicitement, pour être testables et reproductibles.
 */

export interface PointMensuel {
  /** Clé AAAA-MM. */
  cle: string;
  label: string;
  facture: number;
  encaisse: number;
}

function clefMois(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function serieMensuelle(data: AppData, nbMois = 6, reference = new Date()): PointMensuel[] {
  const mois: PointMensuel[] = [];
  for (let i = nbMois - 1; i >= 0; i -= 1) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    mois.push({
      cle: clefMois(d),
      label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d),
      facture: 0,
      encaisse: 0,
    });
  }
  const index = new Map(mois.map((m) => [m.cle, m]));

  for (const f of data.factures) {
    if (f.statut === 'annulee') continue;
    const cible = index.get(f.date.slice(0, 7));
    if (cible) cible.facture = arrondi2(cible.facture + totalFacture(f));
    for (const p of f.paiements) {
      const m = index.get(p.date.slice(0, 7));
      if (m) m.encaisse = arrondi2(m.encaisse + p.montant);
    }
  }
  return mois;
}

export interface TauxAcceptation {
  presentes: number;
  acceptes: number;
  refuses: number;
  enAttente: number;
  /** Part des devis décidés qui ont été acceptés, en %. */
  taux: number;
  /** Montant accepté rapporté au montant présenté, en %. */
  tauxValeur: number;
  montantAccepte: number;
  montantPresente: number;
}

export function tauxAcceptationDevis(data: AppData): TauxAcceptation {
  let acceptes = 0;
  let refuses = 0;
  let enAttente = 0;
  let montantAccepte = 0;
  let montantPresente = 0;

  for (const d of data.devis) {
    if (d.statut === 'brouillon') continue;
    // Le montant présenté est celui de l'option la plus représentative : la première.
    const principale = d.variantes[0];
    const valeur = principale ? principale.lignes.reduce((s, l) => s + l.quantite * l.tarif, 0) : 0;
    montantPresente += valeur;

    if (d.statut === 'accepte') {
      acceptes += 1;
      const retenue = d.variantes.find((v) => v.id === d.varianteAcceptee);
      montantAccepte += retenue ? retenue.lignes.reduce((s, l) => s + l.quantite * l.tarif, 0) : 0;
    } else if (d.statut === 'refuse') {
      refuses += 1;
    } else {
      enAttente += 1;
    }
  }

  const decides = acceptes + refuses;
  return {
    presentes: acceptes + refuses + enAttente,
    acceptes,
    refuses,
    enAttente,
    taux: decides === 0 ? 0 : Math.round((acceptes / decides) * 1000) / 10,
    tauxValeur: montantPresente === 0 ? 0 : Math.round((montantAccepte / montantPresente) * 1000) / 10,
    montantAccepte: arrondi2(montantAccepte),
    montantPresente: arrondi2(montantPresente),
  };
}

export interface StatistiquesRdv {
  total: number;
  honores: number;
  absents: number;
  annules: number;
  /** Part de rendez-vous non honorés sans prévenir, en %. */
  tauxAbsenteisme: number;
  /** Minutes réservées sur la période. */
  minutesReservees: number;
}

export function statistiquesRdv(data: AppData, depuis: Date, jusqua = new Date()): StatistiquesRdv {
  const periode = data.rendezVous.filter((r) => {
    const d = new Date(r.debut);
    return d >= depuis && d <= jusqua;
  });
  const absents = periode.filter((r) => r.statut === 'absent').length;
  const annules = periode.filter((r) => r.statut === 'annule').length;
  const honores = periode.filter((r) => r.statut === 'termine').length;
  const comptabilises = periode.length - annules;
  return {
    total: periode.length,
    honores,
    absents,
    annules,
    tauxAbsenteisme: comptabilises === 0 ? 0 : Math.round((absents / comptabilises) * 1000) / 10,
    minutesReservees: periode.filter((r) => r.statut !== 'annule').reduce((s, r) => s + r.duree, 0),
  };
}

export interface ChargePraticien {
  praticien: string;
  minutes: number;
  rendezVous: number;
  /** Part des minutes ouvrables occupées, en %. */
  occupation: number;
}

/** Charge par praticien sur une période, rapportée aux heures ouvrables. */
export function chargeParPraticien(
  data: AppData,
  depuis: Date,
  jusqua: Date,
  heuresParJour = 8,
  joursOuvres = 5,
): ChargePraticien[] {
  const jours = Math.max(1, Math.ceil((jusqua.getTime() - depuis.getTime()) / 86400000));
  const minutesOuvrables = (jours * (joursOuvres / 7)) * heuresParJour * 60;

  return data.cabinet.praticiens.map((p) => {
    const siens = data.rendezVous.filter((r) => {
      const d = new Date(r.debut);
      return r.praticien === p.nom && r.statut !== 'annule' && d >= depuis && d <= jusqua;
    });
    const minutes = siens.reduce((s, r) => s + r.duree, 0);
    return {
      praticien: p.nom,
      minutes,
      rendezVous: siens.length,
      occupation: minutesOuvrables === 0 ? 0 : Math.round((minutes / minutesOuvrables) * 1000) / 10,
    };
  });
}

export interface LigneCategorie {
  categorie: string;
  nombre: number;
  montant: number;
}

/** Répartition des actes réalisés par catégorie, en volume et en honoraires. */
export function repartitionActes(data: AppData): LigneCategorie[] {
  const parCategorie = new Map<string, LigneCategorie>();
  for (const a of data.actes) {
    if (a.statut !== 'realise') continue;
    const categorie = trouverActe(a.codeActe)?.categorie ?? 'Autre';
    const ligne = parCategorie.get(categorie) ?? { categorie, nombre: 0, montant: 0 };
    ligne.nombre += 1;
    ligne.montant = arrondi2(ligne.montant + a.tarif);
    parCategorie.set(categorie, ligne);
  }
  return [...parCategorie.values()].sort((a, b) => b.montant - a.montant);
}

export interface SanteFinanciere {
  factureTotal: number;
  encaisseTotal: number;
  resteDu: number;
  /** Part du facturé effectivement encaissée, en %. */
  tauxRecouvrement: number;
  /** Reste dû depuis plus de 60 jours. */
  retardLong: number;
}

export function santeFinanciere(data: AppData, reference = new Date()): SanteFinanciere {
  const valides = data.factures.filter((f) => f.statut !== 'annulee');
  const facture = valides.reduce((s, f) => s + totalFacture(f), 0);
  const encaisse = valides.reduce((s, f) => s + totalPaye(f), 0);
  const retardLong = valides
    .filter((f) => {
      const jours = (reference.getTime() - new Date(`${f.date}T00:00:00`).getTime()) / 86400000;
      return jours > 60 && resteAPayer(f) > 0;
    })
    .reduce((s, f) => s + resteAPayer(f), 0);

  return {
    factureTotal: arrondi2(facture),
    encaisseTotal: arrondi2(encaisse),
    resteDu: arrondi2(facture - encaisse),
    tauxRecouvrement: facture === 0 ? 0 : Math.round((encaisse / facture) * 1000) / 10,
    retardLong: arrondi2(retardLong),
  };
}

/* ------------------------------------------------------------------ *
 * Moteur de rappels
 * ------------------------------------------------------------------ */

export interface Rappel {
  patient: Patient;
  /** Date à laquelle le contrôle était attendu. */
  echeance: string;
  joursDeRetard: number;
  /** Vrai si un rendez-vous est déjà programmé : inutile de relancer. */
  rdvProgramme: boolean;
}

/**
 * Patients dont la visite de contrôle est échue. Un patient déjà reprogrammé
 * n'est pas relancé : le but est une liste d'appels réellement actionnable.
 */
export function patientsARappeler(data: AppData, reference = new Date()): Rappel[] {
  const rappels: Rappel[] = [];
  for (const p of data.patients) {
    if (!p.actif || p.rappelMois <= 0 || !p.dernierControle) continue;
    const echeance = new Date(`${p.dernierControle}T00:00:00`);
    echeance.setMonth(echeance.getMonth() + p.rappelMois);
    if (echeance > reference) continue;

    const rdvProgramme = data.rendezVous.some(
      (r) => r.patientId === p.id && r.statut !== 'annule' && new Date(r.debut) > reference,
    );
    rappels.push({
      patient: p,
      echeance: echeance.toISOString().slice(0, 10),
      joursDeRetard: Math.floor((reference.getTime() - echeance.getTime()) / 86400000),
      rdvProgramme,
    });
  }
  return rappels.sort((a, b) => b.joursDeRetard - a.joursDeRetard);
}

/** Actes réalisés mais jamais facturés : du chiffre d'affaires oublié. */
export function actesNonFactures(data: AppData): { nombre: number; montant: number } {
  const factures = new Set(data.factures.flatMap((f) => f.lignes.map((l) => l.acteId).filter(Boolean)));
  const oublies = data.actes.filter((a) => a.statut === 'realise' && !factures.has(a.id));
  return { nombre: oublies.length, montant: arrondi2(oublies.reduce((s, a) => s + a.tarif, 0)) };
}
