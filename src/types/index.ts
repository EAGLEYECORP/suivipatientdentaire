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
  medecinTraitant: string;
  allergies: string[];
  antecedents: string[];
  traitementsEnCours: string[];
  /** Red-flag alerts shown prominently in the file (anticoagulants, endocarditis risk...). */
  alertes: string[];
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
  /** Part covered by the mandatory scheme, in currency units. */
  baseRemboursement: number;
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
}
