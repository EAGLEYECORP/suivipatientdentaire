export interface ModeleActe {
  code: string;
  libelle: string;
  categorie: string;
  tarif: number;
  baseRemboursement: number;
  /** Whether the act targets one or more specific teeth. */
  cible: 'dent' | 'general';
  dureeMinutes: number;
}

/**
 * Indicative catalogue based on common CCAM dental codes.
 * Tariffs are editable per act when it is added to a treatment plan.
 */
export const CATALOGUE_ACTES: ModeleActe[] = [
  { code: 'HBQK002', libelle: 'Bilan bucco-dentaire', categorie: 'Diagnostic', tarif: 30, baseRemboursement: 30, cible: 'general', dureeMinutes: 30 },
  { code: 'HBQK389', libelle: 'Radiographie rétro-alvéolaire', categorie: 'Imagerie', tarif: 7.98, baseRemboursement: 7.98, cible: 'dent', dureeMinutes: 10 },
  { code: 'HBQK040', libelle: 'Radiographie panoramique', categorie: 'Imagerie', tarif: 21.28, baseRemboursement: 21.28, cible: 'general', dureeMinutes: 15 },
  { code: 'HBJD001', libelle: 'Détartrage deux arcades', categorie: 'Prophylaxie', tarif: 28.92, baseRemboursement: 28.92, cible: 'general', dureeMinutes: 30 },
  { code: 'HBBD001', libelle: 'Scellement de sillons', categorie: 'Prophylaxie', tarif: 21.6, baseRemboursement: 21.6, cible: 'dent', dureeMinutes: 20 },
  { code: 'HBMD038', libelle: 'Obturation 1 face', categorie: 'Soin conservateur', tarif: 26.97, baseRemboursement: 26.97, cible: 'dent', dureeMinutes: 30 },
  { code: 'HBMD053', libelle: 'Obturation 2 faces', categorie: 'Soin conservateur', tarif: 45.38, baseRemboursement: 45.38, cible: 'dent', dureeMinutes: 40 },
  { code: 'HBMD049', libelle: 'Obturation 3 faces ou plus', categorie: 'Soin conservateur', tarif: 64.5, baseRemboursement: 64.5, cible: 'dent', dureeMinutes: 50 },
  { code: 'HBFD001', libelle: 'Coiffage pulpaire', categorie: 'Soin conservateur', tarif: 32, baseRemboursement: 32, cible: 'dent', dureeMinutes: 30 },
  { code: 'HBBD490', libelle: 'Traitement endodontique monoradiculaire', categorie: 'Endodontie', tarif: 33.74, baseRemboursement: 33.74, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBBD351', libelle: 'Traitement endodontique biradiculaire', categorie: 'Endodontie', tarif: 48.2, baseRemboursement: 48.2, cible: 'dent', dureeMinutes: 75 },
  { code: 'HBBD006', libelle: 'Traitement endodontique pluriradiculaire', categorie: 'Endodontie', tarif: 81.94, baseRemboursement: 81.94, cible: 'dent', dureeMinutes: 90 },
  { code: 'HBGD036', libelle: 'Avulsion dent permanente', categorie: 'Chirurgie', tarif: 33.44, baseRemboursement: 33.44, cible: 'dent', dureeMinutes: 30 },
  { code: 'HBGD017', libelle: 'Avulsion dent incluse / germectomie', categorie: 'Chirurgie', tarif: 83.6, baseRemboursement: 83.6, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBLD017', libelle: 'Couronne céramo-métallique', categorie: 'Prothèse', tarif: 500, baseRemboursement: 120, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBLD038', libelle: 'Couronne céramique monolithique', categorie: 'Prothèse', tarif: 600, baseRemboursement: 120, cible: 'dent', dureeMinutes: 60 },
  { code: 'HBLD724', libelle: 'Inlay-core', categorie: 'Prothèse', tarif: 175, baseRemboursement: 90, cible: 'dent', dureeMinutes: 45 },
  { code: 'HBLD033', libelle: 'Bridge 3 éléments', categorie: 'Prothèse', tarif: 1200, baseRemboursement: 279.5, cible: 'dent', dureeMinutes: 90 },
  { code: 'HBLD402', libelle: 'Prothèse amovible résine (par dent)', categorie: 'Prothèse', tarif: 64.5, baseRemboursement: 64.5, cible: 'dent', dureeMinutes: 45 },
  { code: 'LBLD010', libelle: 'Pose d’implant intra-osseux', categorie: 'Implantologie', tarif: 900, baseRemboursement: 0, cible: 'dent', dureeMinutes: 90 },
  { code: 'HBMD490', libelle: 'Éclaircissement / blanchiment', categorie: 'Esthétique', tarif: 350, baseRemboursement: 0, cible: 'general', dureeMinutes: 60 },
  { code: 'TDO90', libelle: 'Semestre orthodontie', categorie: 'Orthodontie', tarif: 193.5, baseRemboursement: 193.5, cible: 'general', dureeMinutes: 30 },
  { code: 'HBQD001', libelle: 'Consultation d’urgence', categorie: 'Urgence', tarif: 23, baseRemboursement: 23, cible: 'general', dureeMinutes: 20 },
];

export const CATEGORIES_ACTES = Array.from(new Set(CATALOGUE_ACTES.map((a) => a.categorie)));

export function trouverActe(code: string): ModeleActe | undefined {
  return CATALOGUE_ACTES.find((a) => a.code === code);
}
