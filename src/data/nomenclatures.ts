/**
 * Nomenclatures d'actes et régimes de couverture.
 *
 * Un logiciel dentaire est généralement câblé sur la nomenclature d'un seul
 * pays. Ici le catalogue est un jeu interchangeable : le cabinet choisit sa
 * nomenclature, et le remboursement se calcule partout de la même façon —
 * tarif de référence multiplié par le taux du régime du patient.
 */

export interface ModeleActe {
  code: string;
  libelle: string;
  categorie: string;
  /** Honoraire conseillé par défaut ; le cabinet fixe le sien. */
  tarif: number;
  /** Tarif de référence servant de base au remboursement (BR en France, TNR au Maroc). */
  tarifReference: number;
  /** Acte portant sur une ou plusieurs dents, ou acte général. */
  cible: 'dent' | 'general';
  dureeMinutes: number;
}

export interface Regime {
  id: string;
  nom: string;
  /** Part du tarif de référence prise en charge, de 0 à 1. */
  taux: number;
}

export interface Nomenclature {
  id: string;
  nom: string;
  pays: string;
  deviseConseillee: string;
  /** Provenance des valeurs et mise en garde éventuelle. */
  note: string;
  /** Vrai seulement si les valeurs ont été confrontées à la source officielle. */
  verifiee: boolean;
  regimes: Regime[];
  actes: ModeleActe[];
}

/* ------------------------------------------------------------------ *
 * France — CCAM
 * ------------------------------------------------------------------ */

const ACTES_FRANCE: ModeleActe[] = [
  { code: 'HBQK002', libelle: 'Bilan bucco-dentaire', categorie: 'Diagnostic', tarif: 30, tarifReference: 30, cible: 'general', dureeMinutes: 30 },
  { code: 'HBQK389', libelle: 'Radiographie rétro-alvéolaire', categorie: 'Imagerie', tarif: 7.98, tarifReference: 7.98, cible: 'dent', dureeMinutes: 10 },
  { code: 'HBQK040', libelle: 'Radiographie panoramique', categorie: 'Imagerie', tarif: 21.28, tarifReference: 21.28, cible: 'general', dureeMinutes: 15 },
  { code: 'HBJD001', libelle: 'Détartrage deux arcades', categorie: 'Prophylaxie', tarif: 28.92, tarifReference: 28.92, cible: 'general', dureeMinutes: 30 },
  { code: 'HBBD001', libelle: 'Scellement de sillons', categorie: 'Prophylaxie', tarif: 21.6, tarifReference: 21.6, cible: 'dent', dureeMinutes: 20 },
  { code: 'HBMD038', libelle: 'Obturation 1 face', categorie: 'Soin conservateur', tarif: 26.97, tarifReference: 26.97, cible: 'dent', dureeMinutes: 30 },
  { code: 'HBMD053', libelle: 'Obturation 2 faces', categorie: 'Soin conservateur', tarif: 45.38, tarifReference: 45.38, cible: 'dent', dureeMinutes: 40 },
  { code: 'HBMD049', libelle: 'Obturation 3 faces ou plus', categorie: 'Soin conservateur', tarif: 64.5, tarifReference: 64.5, cible: 'dent', dureeMinutes: 50 },
  { code: 'HBFD001', libelle: 'Coiffage pulpaire', categorie: 'Soin conservateur', tarif: 32, tarifReference: 32, cible: 'dent', dureeMinutes: 30 },
  { code: 'HBBD490', libelle: 'Traitement endodontique monoradiculaire', categorie: 'Endodontie', tarif: 33.74, tarifReference: 33.74, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBBD351', libelle: 'Traitement endodontique biradiculaire', categorie: 'Endodontie', tarif: 48.2, tarifReference: 48.2, cible: 'dent', dureeMinutes: 75 },
  { code: 'HBBD006', libelle: 'Traitement endodontique pluriradiculaire', categorie: 'Endodontie', tarif: 81.94, tarifReference: 81.94, cible: 'dent', dureeMinutes: 90 },
  { code: 'HBGD036', libelle: 'Avulsion dent permanente', categorie: 'Chirurgie', tarif: 33.44, tarifReference: 33.44, cible: 'dent', dureeMinutes: 30 },
  { code: 'HBGD017', libelle: 'Avulsion dent incluse / germectomie', categorie: 'Chirurgie', tarif: 83.6, tarifReference: 83.6, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBLD017', libelle: 'Couronne céramo-métallique', categorie: 'Prothèse', tarif: 500, tarifReference: 120, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBLD038', libelle: 'Couronne céramique monolithique', categorie: 'Prothèse', tarif: 600, tarifReference: 120, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBLD724', libelle: 'Inlay-core', categorie: 'Prothèse', tarif: 175, tarifReference: 90, cible: 'dent', dureeMinutes: 45 },
  { code: 'HBLD033', libelle: 'Bridge 3 éléments', categorie: 'Prothèse', tarif: 1200, tarifReference: 279.5, cible: 'dent', dureeMinutes: 90 },
  { code: 'HBLD402', libelle: 'Prothèse amovible résine (par dent)', categorie: 'Prothèse', tarif: 64.5, tarifReference: 64.5, cible: 'dent', dureeMinutes: 45 },
  { code: 'LBLD010', libelle: 'Pose d’implant intra-osseux', categorie: 'Implantologie', tarif: 900, tarifReference: 0, cible: 'dent', dureeMinutes: 90 },
  { code: 'HBMD490', libelle: 'Éclaircissement / blanchiment', categorie: 'Esthétique', tarif: 350, tarifReference: 0, cible: 'general', dureeMinutes: 60 },
  { code: 'TDO90', libelle: 'Semestre orthodontie', categorie: 'Orthodontie', tarif: 193.5, tarifReference: 193.5, cible: 'general', dureeMinutes: 30 },
  { code: 'HBQD001', libelle: 'Consultation d’urgence', categorie: 'Urgence', tarif: 23, tarifReference: 23, cible: 'general', dureeMinutes: 20 },
];

/* ------------------------------------------------------------------ *
 * Maroc — NGAP / Tarification nationale de référence
 * ------------------------------------------------------------------ */

/**
 * Les bases de remboursement marocaines suivent la Tarification nationale de
 * référence, fixée en 2006 et jamais revalorisée depuis. Les honoraires
 * pratiqués au cabinet sont donc très supérieurs au tarif de référence : les
 * honoraires conseillés ci-dessous sont des ordres de grandeur de marché, à
 * remplacer par les vôtres.
 */
const ACTES_MAROC: ModeleActe[] = [
  { code: 'C', libelle: 'Consultation', categorie: 'Diagnostic', tarif: 200, tarifReference: 80, cible: 'general', dureeMinutes: 30 },
  { code: 'D708', libelle: 'Détartrage complet, deux arcades', categorie: 'Prophylaxie', tarif: 400, tarifReference: 210, cible: 'general', dureeMinutes: 30 },
  { code: 'D700', libelle: 'Obturation 1 face', categorie: 'Soin conservateur', tarif: 300, tarifReference: 175, cible: 'dent', dureeMinutes: 30 },
  { code: 'D701', libelle: 'Obturation 2 faces', categorie: 'Soin conservateur', tarif: 400, tarifReference: 175, cible: 'dent', dureeMinutes: 40 },
  { code: 'D702', libelle: 'Obturation 3 faces ou plus', categorie: 'Soin conservateur', tarif: 500, tarifReference: 262, cible: 'dent', dureeMinutes: 50 },
  { code: 'D703', libelle: 'Pulpotomie', categorie: 'Endodontie', tarif: 300, tarifReference: 122, cible: 'dent', dureeMinutes: 40 },
  { code: 'D738', libelle: 'Curetage périapical / résection apicale', categorie: 'Chirurgie', tarif: 1500, tarifReference: 262, cible: 'dent', dureeMinutes: 60 },
  { code: 'D713', libelle: 'Extraction de dent permanente', categorie: 'Chirurgie', tarif: 350, tarifReference: 175, cible: 'dent', dureeMinutes: 30 },
  { code: 'D714', libelle: 'Extraction suivante dans la même séance', categorie: 'Chirurgie', tarif: 200, tarifReference: 87, cible: 'dent', dureeMinutes: 20 },
  { code: 'D715', libelle: 'Extraction de dent temporaire', categorie: 'Chirurgie', tarif: 250, tarifReference: 140, cible: 'dent', dureeMinutes: 20 },
  { code: 'D720', libelle: 'Extraction de dent de sagesse incluse', categorie: 'Chirurgie', tarif: 2000, tarifReference: 700, cible: 'dent', dureeMinutes: 60 },
  { code: 'D726', libelle: 'Extraction de dent incluse (canine)', categorie: 'Chirurgie', tarif: 2500, tarifReference: 875, cible: 'dent', dureeMinutes: 75 },
  { code: 'D750', libelle: 'Couronne métallique (nickel-chrome)', categorie: 'Prothèse', tarif: 1200, tarifReference: 625, cible: 'dent', dureeMinutes: 60 },
  { code: 'D754', libelle: 'Couronne céramo-métallique', categorie: 'Prothèse', tarif: 2500, tarifReference: 2250, cible: 'dent', dureeMinutes: 60 },
];

export const NOMENCLATURES: Nomenclature[] = [
  {
    id: 'ccam-fr',
    nom: 'France — CCAM',
    pays: 'France',
    deviseConseillee: 'EUR',
    note: 'Codes et bases de remboursement usuels de la CCAM dentaire. À confirmer avec les tarifs en vigueur.',
    verifiee: false,
    regimes: [
      { id: 'am', nom: 'Assurance maladie', taux: 0.7 },
      { id: 'am-css', nom: 'Complémentaire santé solidaire', taux: 1 },
      { id: 'aucun', nom: 'Sans couverture', taux: 0 },
    ],
    actes: ACTES_FRANCE,
  },
  {
    id: 'ngap-ma',
    nom: 'Maroc — NGAP / TNR',
    pays: 'Maroc',
    deviseConseillee: 'MAD',
    note:
      'Catalogue de départ, partiel. Les bases suivent la Tarification nationale de référence fixée en 2006. ' +
      'Les valeurs proviennent de sources secondaires, les documents officiels n’ayant pas pu être consultés : ' +
      'à confronter à la nomenclature en vigueur avant tout usage de facturation. Les honoraires conseillés sont ' +
      'des ordres de grandeur de marché, à remplacer par les vôtres.',
    verifiee: false,
    regimes: [
      { id: 'cnss', nom: 'CNSS (AMO)', taux: 0.7 },
      { id: 'cnops', nom: 'CNOPS (AMO)', taux: 0.8 },
      { id: 'aucun', nom: 'Sans couverture', taux: 0 },
    ],
    actes: ACTES_MAROC,
  },
];

export const NOMENCLATURE_PAR_DEFAUT = 'ccam-fr';

export function nomenclature(id: string): Nomenclature {
  return NOMENCLATURES.find((n) => n.id === id) ?? NOMENCLATURES[0];
}

export function actesDe(id: string): ModeleActe[] {
  return nomenclature(id).actes;
}

export function categoriesDe(id: string): string[] {
  return Array.from(new Set(actesDe(id).map((a) => a.categorie)));
}

export function trouverActeDans(id: string, code: string): ModeleActe | undefined {
  return actesDe(id).find((a) => a.code === code);
}

export function regimesDe(id: string): Regime[] {
  return nomenclature(id).regimes;
}

/** Vrai si le régime existe dans la nomenclature active. */
export function regimeConnu(nomenclatureId: string, regimeId: string | null | undefined): boolean {
  if (!regimeId) return false;
  return regimesDe(nomenclatureId).some((r) => r.id === regimeId);
}

/** Taux de prise en charge du régime, ou 0 si le régime est inconnu. */
export function tauxRegime(nomenclatureId: string, regimeId: string | null | undefined): number {
  if (!regimeId) return 0;
  return regimesDe(nomenclatureId).find((r) => r.id === regimeId)?.taux ?? 0;
}
