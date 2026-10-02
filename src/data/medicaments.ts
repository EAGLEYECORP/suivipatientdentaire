/**
 * Modèles de prescription courants en odontologie.
 *
 * Ce sont des points de départ à adapter : posologie, durée et contre-indications
 * relèvent de la décision du praticien, qui reste responsable de l'ordonnance.
 */
export interface ModeleOrdonnance {
  id: string;
  intitule: string;
  indication: string;
  lignes: Array<{ medicament: string; posologie: string; duree: string; quantite: string }>;
  /** Allergies rendant ce modèle inadapté ; rapprochées du dossier du patient. */
  contreIndications: string[];
}

export const MODELES_ORDONNANCE: ModeleOrdonnance[] = [
  {
    id: 'douleur-simple',
    intitule: 'Antalgie de palier 1',
    indication: 'Douleur post-opératoire modérée',
    lignes: [
      {
        medicament: 'Paracétamol 1 g',
        posologie: '1 comprimé toutes les 6 heures, sans dépasser 4 g par jour',
        duree: '5 jours',
        quantite: '1 boîte',
      },
    ],
    contreIndications: ['paracétamol', 'insuffisance hépatique'],
  },
  {
    id: 'douleur-inflammation',
    intitule: 'Antalgie et anti-inflammatoire',
    indication: 'Douleur avec composante inflammatoire',
    lignes: [
      {
        medicament: 'Paracétamol 1 g',
        posologie: '1 comprimé toutes les 6 heures si douleur',
        duree: '5 jours',
        quantite: '1 boîte',
      },
      {
        medicament: 'Ibuprofène 400 mg',
        posologie: '1 comprimé 3 fois par jour au cours des repas',
        duree: '3 jours',
        quantite: '1 boîte',
      },
    ],
    contreIndications: ['ibuprofène', 'ains', 'ulcère', 'anticoagulant', 'grossesse'],
  },
  {
    id: 'infection',
    intitule: 'Antibiothérapie de première intention',
    indication: 'Infection d’origine dentaire',
    lignes: [
      {
        medicament: 'Amoxicilline 1 g',
        posologie: '1 comprimé matin et soir',
        duree: '7 jours',
        quantite: '1 boîte',
      },
    ],
    contreIndications: ['pénicilline', 'amoxicilline', 'bêta-lactamine'],
  },
  {
    id: 'infection-allergie',
    intitule: 'Antibiothérapie en cas d’allergie aux bêta-lactamines',
    indication: 'Infection dentaire chez un patient allergique à la pénicilline',
    lignes: [
      {
        medicament: 'Clindamycine 300 mg',
        posologie: '1 gélule 3 fois par jour',
        duree: '7 jours',
        quantite: '1 boîte',
      },
    ],
    contreIndications: ['clindamycine', 'lincosamide'],
  },
  {
    id: 'prophylaxie',
    intitule: 'Antibioprophylaxie avant geste sanglant',
    indication: 'Patient à haut risque d’endocardite infectieuse',
    lignes: [
      {
        medicament: 'Amoxicilline 2 g',
        posologie: 'Dose unique, 1 heure avant le geste',
        duree: 'Prise unique',
        quantite: '1 boîte',
      },
    ],
    contreIndications: ['pénicilline', 'amoxicilline', 'bêta-lactamine'],
  },
  {
    id: 'bain-bouche',
    intitule: 'Bain de bouche antiseptique',
    indication: 'Suites opératoires, hygiène post-chirurgicale',
    lignes: [
      {
        medicament: 'Chlorhexidine 0,12 %',
        posologie: '1 bain de bouche 2 fois par jour, à distance du brossage',
        duree: '7 jours',
        quantite: '1 flacon',
      },
    ],
    contreIndications: ['chlorhexidine'],
  },
  {
    id: 'fluor',
    intitule: 'Prévention du risque carieux élevé',
    indication: 'Risque carieux élevé ou extrême',
    lignes: [
      {
        medicament: 'Dentifrice fluoré 5 000 ppm',
        posologie: 'Brossage biquotidien, sans rincer après le brossage du soir',
        duree: '3 mois',
        quantite: '1 tube',
      },
    ],
    contreIndications: [],
  },
];

/**
 * Confronte un modèle aux allergies déclarées du patient.
 * Retourne l'allergie qui s'oppose à la prescription, ou null.
 */
export function contreIndication(modele: ModeleOrdonnance, allergies: string[]): string | null {
  const normaliser = (t: string) =>
    t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();

  for (const allergie of allergies) {
    const a = normaliser(allergie);
    if (!a) continue;
    for (const ci of modele.contreIndications) {
      const c = normaliser(ci);
      if (a.includes(c) || c.includes(a)) return allergie;
    }
  }
  return null;
}
