/** Domain model for the dental practice tracker. */

export type Sexe = 'F' | 'M' | 'Autre';

export type Dentition = 'permanente' | 'temporaire';

/** Faces (surfaces) of a tooth, FR notation. */
export type Face = 'M' | 'D' | 'V' | 'L' | 'O';

/** Clinical state of a single tooth. */
export type EtatDent =
  | 'saine'
  | 'carie'
  | 'obturation'
  | 'couronne'
  | 'implant'
  | 'bridge'
  | 'absente'
  | 'a_extraire'
  | 'endodontie'
  | 'fracture'
  | 'mobile';

export type StatutActe = 'planifie' | 'en_cours' | 'realise' | 'annule';

export type StatutRdv = 'prevu' | 'confirme' | 'en_salle' | 'termine' | 'annule' | 'absent';

export type StatutFacture = 'brouillon' | 'emise' | 'partielle' | 'payee' | 'annulee';

export type MoyenPaiement = 'especes' | 'carte' | 'cheque' | 'virement' | 'mutuelle';

export interface FacteursRisque {
  tabac: 'non' | 'moins_10' | 'dix_ou_plus';
  diabete: 'non' | 'equilibre' | 'desequilibre';
  grossesse: boolean;
  /** Hyposialie / bouche sèche (médicaments, radiothérapie, syndrome sec). */
  boucheSeche: boolean;
  /** Grignotage ou boissons sucrées répétées dans la journée. */
  grignotageSucre: boolean;
  /** Exposition au fluor (dentifrice fluoré, vernis, eau fluorée). */
  expositionFluor: boolean;
  /** Hygiène bucco-dentaire jugée insuffisante à l'examen. */
  hygieneInsuffisante: boolean;
  /** Appareil orthodontique, prothèse ou dispositif rétenteur de plaque. */
  appareillage: boolean;
}

export interface Patient {
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string; // ISO yyyy-mm-dd
  sexe: Sexe;
  telephone: string;
  email: string;
  adresse: string;
  numeroSecu: string;
  mutuelle: string;
  /** Régime de couverture du patient, dans la nomenclature active. */
  regime: string;
  medecinTraitant: string;
  allergies: string[];
  antecedents: string[];
  traitementsEnCours: string[];
  /** Red-flag alerts shown prominently in the file (anticoagulants, endocarditis risk...). */
  alertes: string[];
  /** Facteurs de risque alimentant l'évaluation carieuse et parodontale. */
  facteursRisque: FacteursRisque;
  /** Intervalle de rappel en mois (0 = pas de rappel). */
  rappelMois: number;
  /** Date du dernier examen de contrôle, pour le moteur de rappels. */
  dernierControle: string | null;
  notes: string;
  creeLe: string; // ISO datetime
  majLe: string; // ISO datetime
  actif: boolean;
}

/** Per-tooth clinical record inside a patient's odontogram. */
export interface DentEtat {
  /** FDI number, e.g. 11..48 (permanent) or 51..85 (primary). */
  numero: number;
  etat: EtatDent;
  faces: Face[];
  note: string;
  majLe: string;
}

export interface Acte {
  id: string;
  patientId: string;
  /** Empty for acts not bound to a specific tooth (detartrage, radio panoramique...). */
  dents: number[];
  faces: Face[];
  codeActe: string;
  libelle: string;
  statut: StatutActe;
  tarif: number;
  /** Tarif de référence servant de base au remboursement (BR en France, TNR au Maroc). */
  tarifReference: number;
  seance: number;
  praticien: string;
  datePrevue: string; // ISO yyyy-mm-dd
  dateRealisation: string | null;
  rdvId: string | null;
  notes: string;
  creeLe: string;
}

export interface RendezVous {
  id: string;
  patientId: string;
  /** ISO datetime of the start. */
  debut: string;
  /** Duration in minutes. */
  duree: number;
  motif: string;
  praticien: string;
  salle: string;
  statut: StatutRdv;
  notes: string;
  rappelEnvoye: boolean;
  creeLe: string;
}

export interface LigneFacture {
  acteId: string | null;
  libelle: string;
  quantite: number;
  prixUnitaire: number;
}

export interface Paiement {
  id: string;
  date: string; // ISO yyyy-mm-dd
  montant: number;
  moyen: MoyenPaiement;
  reference: string;
}

export interface Facture {
  id: string;
  numero: string;
  patientId: string;
  date: string; // ISO yyyy-mm-dd
  lignes: LigneFacture[];
  paiements: Paiement[];
  statut: StatutFacture;
  notes: string;
  creeLe: string;
}

/** A dated entry in the patient's clinical timeline. */
export interface NoteClinique {
  id: string;
  patientId: string;
  date: string; // ISO datetime
  auteur: string;
  categorie: 'consultation' | 'soin' | 'urgence' | 'controle' | 'administratif';
  contenu: string;
  dents: number[];
}

export interface Praticien {
  id: string;
  nom: string;
  specialite: string;
  couleur: string;
}

export interface Cabinet {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  siret: string;
  devise: string;
  tauxTva: number;
  dureeRdvDefaut: number;
  /** Nomenclature d'actes active (voir data/nomenclatures.ts). */
  nomenclature: string;
  /** Régime de couverture proposé par défaut aux nouveaux patients. */
  regimeParDefaut: string;
  /** Verrouillage automatique du coffre après N minutes d'inactivité (0 = jamais). */
  verrouillageMinutes: number;
  praticiens: Praticien[];
}

export interface Odontogramme {
  patientId: string;
  dentition: Dentition;
  dents: DentEtat[];
}

/** Everything the app persists. */
export interface AppData {
  version: number;
  cabinet: Cabinet;
  patients: Patient[];
  odontogrammes: Odontogramme[];
  actes: Acte[];
  rendezVous: RendezVous[];
  factures: Facture[];
  notes: NoteClinique[];
  /** Journal append-only : jamais modifié, jamais purgé. */
  journal: EvenementJournal[];
  chartingsParo: ChartingParo[];
  images: ImageClinique[];
  devis: Devis[];
  ordonnances: Ordonnance[];
}

/* ------------------------------------------------------------------ *
 * Journal clinique : trace inviolable de toute modification.
 * Chaque mutation du dossier écrit un événement horodaté et signé par
 * son auteur, avec l'état avant et après. Le journal n'est jamais
 * modifié ni supprimé : il sert d'audit, d'historique par dent et de
 * machine à remonter le temps sur le schéma dentaire.
 * ------------------------------------------------------------------ */

export type TypeEvenement =
  | 'patient.cree'
  | 'patient.maj'
  | 'patient.supprime'
  | 'dent.maj'
  | 'dent.reset'
  | 'dentition.maj'
  | 'perio.enregistre'
  | 'acte.cree'
  | 'acte.maj'
  | 'acte.supprime'
  | 'rdv.cree'
  | 'rdv.maj'
  | 'rdv.supprime'
  | 'facture.cree'
  | 'facture.maj'
  | 'facture.supprime'
  | 'paiement.ajoute'
  | 'paiement.supprime'
  | 'note.cree'
  | 'note.supprime'
  | 'image.ajoutee'
  | 'image.supprimee'
  | 'devis.cree'
  | 'devis.maj'
  | 'devis.decide'
  | 'ordonnance.cree'
  | 'cabinet.maj'
  | 'donnees.importees'
  | 'donnees.effacees';

export interface EvenementJournal {
  id: string;
  date: string;
  auteur: string;
  type: TypeEvenement;
  patientId: string | null;
  /** Numéro FDI lorsque l'événement concerne une dent précise. */
  dent: number | null;
  /** Libellé court de la cible, ex. « Dent 26 » ou « Facture FA-2026-0007 ». */
  cible: string;
  resume: string;
  avant: unknown;
  apres: unknown;
}

/* ------------------------------------------------------------------ *
 * Parodontologie
 * ------------------------------------------------------------------ */

/** Six sites de sondage par dent, vestibulaire puis lingual/palatin. */
export type SitePerio = 'MV' | 'V' | 'DV' | 'ML' | 'L' | 'DL';

export interface MesureSite {
  /** Profondeur de poche au sondage, en mm. */
  pd: number | null;
  /** Récession gingivale en mm (négatif = hyperplasie recouvrant la JEC). */
  rec: number | null;
  /** Saignement au sondage. */
  bop: boolean;
  plaque: boolean;
  /** Suppuration. */
  pus: boolean;
}

export interface DentPerio {
  numero: number;
  sites: Record<SitePerio, MesureSite>;
  /** Mobilité de Mühlemann 0 à 3. */
  mobilite: 0 | 1 | 2 | 3;
  /** Atteinte de furcation de Hamp 0 à 3 (dents pluriradiculées). */
  furcation: 0 | 1 | 2 | 3;
}

export interface ChartingParo {
  id: string;
  patientId: string;
  date: string;
  praticien: string;
  dents: DentPerio[];
  /** Perte osseuse radiographique maximale en % de la longueur radiculaire. */
  perteOsseusePct: number | null;
  fumeur: 'non' | 'moins_10' | 'dix_ou_plus';
  diabete: 'non' | 'equilibre' | 'desequilibre';
  notes: string;
}

/* ------------------------------------------------------------------ *
 * Imagerie clinique (binaires stockés en IndexedDB, métadonnées ici)
 * ------------------------------------------------------------------ */

export type TypeImage = 'retroalveolaire' | 'bitewing' | 'panoramique' | 'cone_beam' | 'photo' | 'autre';

export interface Annotation {
  id: string;
  x: number;
  y: number;
  texte: string;
}

export interface ImageClinique {
  id: string;
  patientId: string;
  dents: number[];
  type: TypeImage;
  date: string;
  libelle: string;
  mime: string;
  taille: number;
  largeur: number;
  hauteur: number;
  annotations: Annotation[];
  creeLe: string;
}

/* ------------------------------------------------------------------ *
 * Devis à variantes
 * ------------------------------------------------------------------ */

export interface LigneDevis {
  id: string;
  codeActe: string;
  libelle: string;
  dents: number[];
  quantite: number;
  tarif: number;
  tarifReference: number;
}

export interface VarianteDevis {
  id: string;
  nom: string;
  description: string;
  lignes: LigneDevis[];
}

export type StatutDevis = 'brouillon' | 'presente' | 'accepte' | 'refuse' | 'expire';

export interface Devis {
  id: string;
  numero: string;
  patientId: string;
  date: string;
  praticien: string;
  variantes: VarianteDevis[];
  varianteAcceptee: string | null;
  dateDecision: string | null;
  statut: StatutDevis;
  validiteJours: number;
  notes: string;
  creeLe: string;
}

/* ------------------------------------------------------------------ *
 * Ordonnances
 * ------------------------------------------------------------------ */

export interface LigneOrdonnance {
  id: string;
  medicament: string;
  posologie: string;
  duree: string;
  quantite: string;
}

export interface Ordonnance {
  id: string;
  patientId: string;
  date: string;
  praticien: string;
  lignes: LigneOrdonnance[];
  notes: string;
  creeLe: string;
}
