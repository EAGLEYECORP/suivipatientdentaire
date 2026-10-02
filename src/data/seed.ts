import type {
  AppData,
  Acte,
  EvenementJournal,
  LigneDevis,
  ChartingParo,
  DentPerio,
  Devis,
  FacteursRisque,
  Facture,
  MesureSite,
  NoteClinique,
  Odontogramme,
  Patient,
  RendezVous,
} from '@/types';
import { CATALOGUE_ACTES, trouverActe } from '@/data/actes';
import { SITES_PERIO, estPluriradiculee } from '@/data/perio';
import { ARCADE_INF_PERM, ARCADE_SUP_PERM, position } from '@/data/teeth';
import { maintenant, uid, arrondi2 } from '@/lib/utils';

export const VERSION_DEMO = 2;

function jour(decalage: number, heure = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  d.setHours(heure, minute, 0, 0);
  return d.toISOString();
}

function jourISO(decalage: number): string {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
}

export function facteursRisqueVides(): FacteursRisque {
  return {
    tabac: 'non',
    diabete: 'non',
    grossesse: false,
    boucheSeche: false,
    grignotageSucre: false,
    expositionFluor: true,
    hygieneInsuffisante: false,
    appareillage: false,
  };
}

export function cabinetParDefaut(): AppData['cabinet'] {
  return {
    nom: 'Cabinet Dentaire Saint-Michel',
    adresse: '14 rue des Lilas, 75011 Paris',
    telephone: '01 42 55 18 90',
    email: 'contact@cabinet-saint-michel.fr',
    siret: '812 345 678 00021',
    devise: 'EUR',
    tauxTva: 0,
    dureeRdvDefaut: 30,
    verrouillageMinutes: 15,
    praticiens: [
      { id: 'prat_1', nom: 'Dr Claire Fontaine', specialite: 'Omnipratique', couleur: '#1d66f0' },
      { id: 'prat_2', nom: 'Dr Samir Benali', specialite: 'Endodontie', couleur: '#14b8a6' },
      { id: 'prat_3', nom: 'Dr Léa Moreau', specialite: 'Orthodontie', couleur: '#8b5cf6' },
    ],
  };
}

export function donneesVides(): AppData {
  return {
    version: 1,
    cabinet: cabinetParDefaut(),
    patients: [],
    odontogrammes: [],
    actes: [],
    rendezVous: [],
    factures: [],
    notes: [],
    journal: [],
    chartingsParo: [],
    images: [],
    devis: [],
    ordonnances: [],
  };
}

interface Graine {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: Patient['sexe'];
  telephone: string;
  email: string;
  adresse: string;
  mutuelle: string;
  allergies: string[];
  antecedents: string[];
  alertes: string[];
  risque?: Partial<FacteursRisque>;
  rappelMois?: number;
  dents: Array<{ numero: number; etat: Odontogramme['dents'][number]['etat']; faces: Odontogramme['dents'][number]['faces']; note?: string }>;
}

const GRAINES: Graine[] = [
  {
    nom: 'Durand', prenom: 'Marie', dateNaissance: '1987-04-12', sexe: 'F',
    telephone: '06 12 45 78 90', email: 'marie.durand@email.fr', adresse: '5 rue Oberkampf, 75011 Paris',
    mutuelle: 'MGEN', allergies: ['Pénicilline'], antecedents: ['Bruxisme'], alertes: [],
    dents: [
      { numero: 16, etat: 'obturation', faces: ['O', 'M'] },
      { numero: 26, etat: 'carie', faces: ['O'], note: 'Carie occlusale profonde, sensibilité au froid.' },
      { numero: 36, etat: 'couronne', faces: [] },
      { numero: 48, etat: 'a_extraire', faces: [], note: 'Dent de sagesse incluse, douleurs récurrentes.' },
    ],
  },
  {
    nom: 'Bernard', prenom: 'Thomas', dateNaissance: '1975-11-03', sexe: 'M',
    telephone: '06 98 32 11 47', email: 't.bernard@email.fr', adresse: '22 av. Parmentier, 75011 Paris',
    mutuelle: 'Harmonie Mutuelle', allergies: [], antecedents: ['Hypertension', 'Diabète type 2'],
    alertes: ['Sous anticoagulant (Kardegic) — prévenir avant toute avulsion'],
    risque: { tabac: 'dix_ou_plus', diabete: 'desequilibre', hygieneInsuffisante: true }, rappelMois: 3,
    dents: [
      { numero: 11, etat: 'fracture', faces: ['V'], note: 'Fêlure amélaire suite à un choc.' },
      { numero: 24, etat: 'endodontie', faces: [] },
      { numero: 46, etat: 'implant', faces: [] },
      { numero: 47, etat: 'absente', faces: [] },
    ],
  },
  {
    nom: 'Lopez', prenom: 'Inès', dateNaissance: '2016-06-21', sexe: 'F',
    telephone: '07 55 21 09 34', email: 'famille.lopez@email.fr', adresse: '9 rue de la Roquette, 75011 Paris',
    mutuelle: 'CPAM — CSS', allergies: ['Latex'], antecedents: [], alertes: ['Patiente mineure — accord parental requis'],
    risque: { grignotageSucre: true, expositionFluor: false }, rappelMois: 6,
    dents: [
      { numero: 54, etat: 'carie', faces: ['O', 'D'] },
      { numero: 75, etat: 'obturation', faces: ['O'] },
      { numero: 61, etat: 'mobile', faces: [], note: 'Mobilité physiologique, chute imminente.' },
    ],
  },
  {
    nom: 'Nguyen', prenom: 'Paul', dateNaissance: '1994-02-08', sexe: 'M',
    telephone: '06 44 78 12 65', email: 'paul.nguyen@email.fr', adresse: '3 bd Voltaire, 75011 Paris',
    mutuelle: 'Alan', allergies: [], antecedents: ['Tabagisme 10 cig/j'], alertes: [],
    risque: { tabac: 'dix_ou_plus', grignotageSucre: true, hygieneInsuffisante: true }, rappelMois: 6,
    dents: [
      { numero: 17, etat: 'carie', faces: ['M', 'O'] },
      { numero: 27, etat: 'carie', faces: ['D'] },
      { numero: 37, etat: 'obturation', faces: ['O'] },
    ],
  },
  {
    nom: 'Cohen', prenom: 'Sarah', dateNaissance: '1962-09-17', sexe: 'F',
    telephone: '06 21 66 03 12', email: 's.cohen@email.fr', adresse: '48 rue Saint-Maur, 75011 Paris',
    mutuelle: 'Malakoff Humanis', allergies: ['Iode'], antecedents: ['Ostéoporose', 'Prise de bisphosphonates'],
    alertes: ['Bisphosphonates — risque d’ostéonécrose, éviter la chirurgie'],
    risque: { boucheSeche: true, hygieneInsuffisante: true }, rappelMois: 4,
    dents: [
      { numero: 13, etat: 'couronne', faces: [] },
      { numero: 12, etat: 'bridge', faces: [] },
      { numero: 14, etat: 'bridge', faces: [] },
      { numero: 34, etat: 'obturation', faces: ['O', 'V'] },
      { numero: 45, etat: 'a_extraire', faces: [], note: 'Racine résiduelle.' },
    ],
  },
  {
    nom: 'Martin', prenom: 'Lucas', dateNaissance: '2008-12-30', sexe: 'M',
    telephone: '07 12 98 44 51', email: 'martin.famille@email.fr', adresse: '17 rue Sedaine, 75011 Paris',
    mutuelle: 'AXA', allergies: [], antecedents: [], alertes: ['Traitement orthodontique en cours'],
    risque: { appareillage: true, grignotageSucre: true }, rappelMois: 4,
    dents: [
      { numero: 16, etat: 'obturation', faces: ['O'] },
      { numero: 26, etat: 'obturation', faces: ['O'] },
      { numero: 46, etat: 'carie', faces: ['O'] },
    ],
  },
  {
    nom: 'Petit', prenom: 'Amélie', dateNaissance: '1999-07-25', sexe: 'F',
    telephone: '06 73 15 82 40', email: 'amelie.petit@email.fr', adresse: '31 rue Popincourt, 75011 Paris',
    mutuelle: 'Aucune', allergies: [], antecedents: [], alertes: [],
    dents: [{ numero: 21, etat: 'fracture', faces: ['V'], note: 'Fracture coronaire simple, secteur esthétique.' }],
  },
  {
    nom: 'Garcia', prenom: 'Antoine', dateNaissance: '1981-03-14', sexe: 'M',
    telephone: '06 55 40 22 78', email: 'a.garcia@email.fr', adresse: '2 passage Charles Dallery, 75011 Paris',
    mutuelle: 'Swiss Life', allergies: ['Anesthésiques locaux (articaïne)'], antecedents: ['Reflux gastro-œsophagien'],
    alertes: ['Allergie articaïne — utiliser mépivacaïne'],
    dents: [
      { numero: 15, etat: 'endodontie', faces: [] },
      { numero: 15, etat: 'couronne', faces: [] },
      { numero: 44, etat: 'carie', faces: ['V'] },
    ],
  },
];

function acte(
  patientId: string,
  code: string,
  dents: number[],
  statut: Acte['statut'],
  decalageJours: number,
  praticien: string,
  seance = 1,
  faces: Acte['faces'] = [],
): Acte {
  const modele = trouverActe(code) ?? CATALOGUE_ACTES[0];
  return {
    id: uid('acte'),
    patientId,
    dents,
    faces,
    codeActe: modele.code,
    libelle: modele.libelle,
    statut,
    tarif: modele.tarif,
    baseRemboursement: modele.baseRemboursement,
    seance,
    praticien,
    datePrevue: jourISO(decalageJours),
    dateRealisation: statut === 'realise' ? jourISO(decalageJours) : null,
    rdvId: null,
    notes: '',
    creeLe: maintenant(),
  };
}

/** Builds a fully populated demo practice so the app is usable on first launch. */
export function donneesDemo(): AppData {
  const cabinet = cabinetParDefaut();
  const [p1, p2, p3] = cabinet.praticiens;

  const patients: Patient[] = [];
  const odontogrammes: Odontogramme[] = [];

  GRAINES.forEach((g, i) => {
    const id = `pat_${i + 1}`;
    patients.push({
      id,
      nom: g.nom,
      prenom: g.prenom,
      dateNaissance: g.dateNaissance,
      sexe: g.sexe,
      telephone: g.telephone,
      email: g.email,
      adresse: g.adresse,
      numeroSecu: `${g.sexe === 'F' ? 2 : 1}${g.dateNaissance.slice(2, 4)}${g.dateNaissance.slice(5, 7)}75${String(100 + i).padStart(3, '0')}`,
      mutuelle: g.mutuelle,
      medecinTraitant: 'Dr Renaud Lefèvre',
      allergies: g.allergies,
      antecedents: g.antecedents,
      traitementsEnCours: [],
      alertes: g.alertes,
      facteursRisque: { ...facteursRisqueVides(), ...(g.risque ?? {}) },
      rappelMois: g.rappelMois ?? 6,
      dernierControle: jourISO(-30 - i * 20),
      notes: '',
      creeLe: jour(-200 + i * 7),
      majLe: jour(-3 + i),
      actif: true,
    });

    const naissance = new Date(`${g.dateNaissance}T00:00:00`);
    const ans = new Date().getFullYear() - naissance.getFullYear();
    odontogrammes.push({
      patientId: id,
      dentition: ans < 7 ? 'temporaire' : 'permanente',
      dents: g.dents.map((d) => ({
        numero: d.numero,
        etat: d.etat,
        faces: d.faces,
        note: d.note ?? '',
        majLe: jour(-10),
      })),
    });
  });

  const actes: Acte[] = [
    acte('pat_1', 'HBJD001', [], 'realise', -30, p1.nom),
    acte('pat_1', 'HBMD053', [26], 'planifie', 4, p1.nom, 1, ['O']),
    acte('pat_1', 'HBGD017', [48], 'planifie', 18, p2.nom, 2),
    acte('pat_2', 'HBBD006', [24], 'realise', -12, p2.nom),
    acte('pat_2', 'HBLD017', [24], 'en_cours', 2, p1.nom, 2),
    acte('pat_2', 'HBQK040', [], 'realise', -12, p1.nom),
    acte('pat_3', 'HBMD038', [54], 'planifie', 6, p1.nom, 1, ['O']),
    acte('pat_3', 'HBBD001', [], 'realise', -45, p1.nom),
    acte('pat_4', 'HBMD053', [17], 'planifie', 1, p1.nom, 1, ['M', 'O']),
    acte('pat_4', 'HBMD038', [27], 'planifie', 1, p1.nom, 1, ['D']),
    acte('pat_5', 'HBGD036', [45], 'planifie', 9, p2.nom),
    acte('pat_5', 'HBLD033', [12, 13, 14], 'realise', -90, p1.nom),
    acte('pat_6', 'TDO90', [], 'en_cours', -20, p3.nom),
    acte('pat_6', 'HBMD038', [46], 'planifie', 11, p1.nom, 1, ['O']),
    acte('pat_7', 'HBLD038', [21], 'planifie', 14, p1.nom),
    acte('pat_8', 'HBLD724', [15], 'realise', -25, p1.nom),
    acte('pat_8', 'HBLD017', [15], 'realise', -11, p1.nom, 2),
    acte('pat_8', 'HBMD038', [44], 'planifie', 3, p1.nom, 1, ['V']),
  ];

  const rendezVous: RendezVous[] = [
    { id: uid('rdv'), patientId: 'pat_4', debut: jour(0, 9, 0), duree: 40, motif: 'Obturation 17 et 27', praticien: p1.nom, salle: 'Salle 1', statut: 'confirme', notes: '', rappelEnvoye: true, creeLe: jour(-6) },
    { id: uid('rdv'), patientId: 'pat_2', debut: jour(0, 10, 0), duree: 60, motif: 'Pose couronne 24', praticien: p1.nom, salle: 'Salle 1', statut: 'prevu', notes: 'Vérifier teinte A2', rappelEnvoye: false, creeLe: jour(-8) },
    { id: uid('rdv'), patientId: 'pat_6', debut: jour(0, 14, 0), duree: 30, motif: 'Contrôle orthodontie', praticien: p3.nom, salle: 'Salle 3', statut: 'confirme', notes: '', rappelEnvoye: true, creeLe: jour(-12) },
    { id: uid('rdv'), patientId: 'pat_8', debut: jour(1, 11, 0), duree: 30, motif: 'Soin 44', praticien: p1.nom, salle: 'Salle 2', statut: 'prevu', notes: 'Allergie articaïne', rappelEnvoye: false, creeLe: jour(-2) },
    { id: uid('rdv'), patientId: 'pat_1', debut: jour(4, 15, 30), duree: 45, motif: 'Obturation 26', praticien: p1.nom, salle: 'Salle 1', statut: 'prevu', notes: '', rappelEnvoye: false, creeLe: jour(-1) },
    { id: uid('rdv'), patientId: 'pat_3', debut: jour(6, 10, 30), duree: 30, motif: 'Soin 54', praticien: p1.nom, salle: 'Salle 2', statut: 'prevu', notes: 'Accompagnée d’un parent', rappelEnvoye: false, creeLe: jour(-1) },
    { id: uid('rdv'), patientId: 'pat_5', debut: jour(9, 9, 30), duree: 40, motif: 'Avulsion 45', praticien: p2.nom, salle: 'Salle 2', statut: 'prevu', notes: 'Bisphosphonates — protocole spécifique', rappelEnvoye: false, creeLe: jour(-4) },
    { id: uid('rdv'), patientId: 'pat_7', debut: jour(14, 16, 0), duree: 60, motif: 'Empreinte couronne 21', praticien: p1.nom, salle: 'Salle 1', statut: 'prevu', notes: '', rappelEnvoye: false, creeLe: jour(-1) },
    { id: uid('rdv'), patientId: 'pat_1', debut: jour(-30, 9, 0), duree: 30, motif: 'Détartrage', praticien: p1.nom, salle: 'Salle 1', statut: 'termine', notes: '', rappelEnvoye: true, creeLe: jour(-40) },
    { id: uid('rdv'), patientId: 'pat_2', debut: jour(-12, 14, 0), duree: 90, motif: 'Endodontie 24', praticien: p2.nom, salle: 'Salle 2', statut: 'termine', notes: '', rappelEnvoye: true, creeLe: jour(-25) },
    { id: uid('rdv'), patientId: 'pat_4', debut: jour(-5, 11, 0), duree: 30, motif: 'Bilan', praticien: p1.nom, salle: 'Salle 1', statut: 'absent', notes: 'Patient non présenté', rappelEnvoye: true, creeLe: jour(-20) },
  ];

  const factures: Facture[] = [
    {
      id: uid('fac'),
      numero: `FA-${new Date().getFullYear()}-0001`,
      patientId: 'pat_2',
      date: jourISO(-12),
      lignes: [
        { acteId: null, libelle: 'Traitement endodontique pluriradiculaire — 24', quantite: 1, prixUnitaire: 81.94 },
        { acteId: null, libelle: 'Radiographie panoramique', quantite: 1, prixUnitaire: 21.28 },
      ],
      paiements: [{ id: uid('pay'), date: jourISO(-12), montant: arrondi2(103.22), moyen: 'carte', reference: 'CB-4412' }],
      statut: 'payee',
      notes: '',
      creeLe: jour(-12),
    },
    {
      id: uid('fac'),
      numero: `FA-${new Date().getFullYear()}-0002`,
      patientId: 'pat_5',
      date: jourISO(-90),
      lignes: [{ acteId: null, libelle: 'Bridge 3 éléments — 12/13/14', quantite: 1, prixUnitaire: 1200 }],
      paiements: [
        { id: uid('pay'), date: jourISO(-90), montant: 400, moyen: 'cheque', reference: 'CHQ-8891' },
        { id: uid('pay'), date: jourISO(-45), montant: 400, moyen: 'virement', reference: 'VIR-2231' },
      ],
      statut: 'partielle',
      notes: 'Règlement en trois fois.',
      creeLe: jour(-90),
    },
    {
      id: uid('fac'),
      numero: `FA-${new Date().getFullYear()}-0003`,
      patientId: 'pat_8',
      date: jourISO(-11),
      lignes: [
        { acteId: null, libelle: 'Inlay-core — 15', quantite: 1, prixUnitaire: 175 },
        { acteId: null, libelle: 'Couronne céramo-métallique — 15', quantite: 1, prixUnitaire: 500 },
      ],
      paiements: [],
      statut: 'emise',
      notes: '',
      creeLe: jour(-11),
    },
  ];

  const notes: NoteClinique[] = [
    { id: uid('note'), patientId: 'pat_1', date: jour(-30, 9, 30), auteur: p1.nom, categorie: 'soin', contenu: 'Détartrage deux arcades. Conseils d’hygiène : brossage 2 min, fil dentaire quotidien.', dents: [] },
    { id: uid('note'), patientId: 'pat_1', date: jour(-10, 9, 0), auteur: p1.nom, categorie: 'consultation', contenu: 'Douleur au froid sur 26. Carie occlusale confirmée à la radio. Obturation planifiée.', dents: [26] },
    { id: uid('note'), patientId: 'pat_2', date: jour(-12, 14, 30), auteur: p2.nom, categorie: 'soin', contenu: 'Traitement endodontique 24 sous digue. Obturation canalaire à la gutta. Contrôle radio satisfaisant.', dents: [24] },
    { id: uid('note'), patientId: 'pat_3', date: jour(-45, 10, 0), auteur: p1.nom, categorie: 'controle', contenu: 'Scellement de sillons réalisé. Bonne coopération. Revoir dans 6 mois.', dents: [] },
    { id: uid('note'), patientId: 'pat_5', date: jour(-5, 11, 0), auteur: p1.nom, categorie: 'consultation', contenu: 'Racine résiduelle sur 45. Avulsion à programmer avec précaution (bisphosphonates), courrier au médecin traitant.', dents: [45] },
    { id: uid('note'), patientId: 'pat_7', date: jour(-2, 17, 0), auteur: p1.nom, categorie: 'urgence', contenu: 'Fracture coronaire 21 suite à une chute. Test de vitalité positif. Reconstitution provisoire posée.', dents: [21] },
  ];

  return {
    version: VERSION_DEMO,
    cabinet,
    patients,
    odontogrammes,
    actes,
    rendezVous,
    factures,
    notes,
    journal: journalDemo(patients, actes, factures),
    chartingsParo: [chartingDemo('pat_2', p2.nom, 12), chartingDemo('pat_5', p1.nom, 4)],
    images: [],
    devis: devisDemo(p1.nom),
    ordonnances: [],
  };
}

/* ------------------------------------------------------------------ *
 * Générateurs de démonstration pour les modules avancés
 * ------------------------------------------------------------------ */

function mesure(pd: number, rec: number, bop: boolean, plaque = false, pus = false): MesureSite {
  return { pd, rec, bop, plaque, pus };
}

/**
 * Charting parodontal réaliste : sondages plus profonds en postérieur,
 * saignement corrélé aux poches, récessions sur les secteurs atteints.
 */
function chartingDemo(patientId: string, praticien: string, severite: number): ChartingParo {
  const dents: DentPerio[] = [...ARCADE_SUP_PERM, ...ARCADE_INF_PERM].map((numero) => {
    const posterieure = position(numero) >= 6;
    const intermediaire = position(numero) >= 4;
    const base = posterieure ? 3 : intermediaire ? 2 : 2;
    const sites = {} as DentPerio['sites'];
    SITES_PERIO.forEach((site, i) => {
      const interdentaire = site !== 'V' && site !== 'L';
      const bonus = interdentaire ? 1 : 0;
      const bruit = (numero * 7 + i * 13 + severite * 3) % 4 === 0 ? 1 : 0;
      const pd = Math.min(10, base + bonus + bruit + (posterieure ? Math.floor(severite / 5) : 0));
      const rec = pd >= 5 ? Math.min(4, Math.floor(severite / 4)) : 0;
      sites[site] = mesure(pd, rec, pd >= 4, (numero + i) % 3 === 0, pd >= 7);
    });
    return {
      numero,
      sites,
      mobilite: (posterieure && severite >= 10 && numero % 7 === 0 ? 1 : 0) as DentPerio['mobilite'],
      furcation: (estPluriradiculee(numero) && severite >= 10 && numero % 5 === 0 ? 1 : 0) as DentPerio['furcation'],
    };
  });

  return {
    id: uid('paro'),
    patientId,
    date: jour(-20),
    praticien,
    dents,
    perteOsseusePct: severite >= 10 ? 35 : 12,
    fumeur: severite >= 10 ? 'dix_ou_plus' : 'non',
    diabete: severite >= 10 ? 'desequilibre' : 'non',
    notes: severite >= 10 ? 'Sondage complet. Réévaluation à 3 mois après assainissement.' : 'Sondage de contrôle.',
  };
}

/** Devis à trois variantes pour le remplacement de la 47 absente. */
function devisDemo(praticien: string): Devis[] {
  const ligne = (codeActe: string, libelle: string, dents: number[], tarif: number, base: number): LigneDevis => ({
    id: uid('lig'),
    codeActe,
    libelle,
    dents,
    quantite: 1,
    tarif,
    baseRemboursement: base,
  });

  return [
    {
      id: uid('dev'),
      numero: `DE-${new Date().getFullYear()}-0001`,
      patientId: 'pat_2',
      date: jourISO(-6),
      praticien,
      variantes: [
        {
          id: 'var_implant',
          nom: 'Implant unitaire',
          description:
            'Solution de référence : aucune dent voisine délabrée, préservation de l’os, longévité la plus élevée.',
          lignes: [
            ligne('LBLD010', 'Pose d’implant intra-osseux', [47], 900, 0),
            ligne('HBLD038', 'Couronne céramique sur implant', [47], 700, 0),
          ],
        },
        {
          id: 'var_bridge',
          nom: 'Bridge 3 éléments',
          description: 'Durée de traitement plus courte, mais nécessite de tailler les dents 46 et 48.',
          lignes: [ligne('HBLD033', 'Bridge céramo-métallique 3 éléments', [46, 47, 48], 1200, 279.5)],
        },
        {
          id: 'var_amovible',
          nom: 'Prothèse amovible partielle',
          description: 'Solution économique et réversible, confort moindre et maintenance régulière.',
          lignes: [ligne('HBLD402', 'Prothèse amovible résine', [47], 450, 193.5)],
        },
      ],
      varianteAcceptee: null,
      dateDecision: null,
      statut: 'presente',
      validiteJours: 90,
      notes: 'Devis remis en main propre et commenté au fauteuil.',
      creeLe: jour(-6),
    },
  ];
}

/** Journal rétroactif cohérent avec les données de démonstration. */
function journalDemo(patients: Patient[], actes: Acte[], factures: Facture[]): EvenementJournal[] {
  const evts: EvenementJournal[] = [];
  const pousser = (
    date: string,
    auteur: string,
    type: EvenementJournal['type'],
    patientId: string | null,
    cible: string,
    resume: string,
    dent: number | null = null,
  ) => {
    evts.push({ id: uid('ev'), date, auteur, type, patientId, dent, cible, resume, avant: null, apres: null });
  };

  const praticien = 'Dr Claire Fontaine';
  for (const p of patients) {
    pousser(p.creeLe, praticien, 'patient.cree', p.id, `${p.prenom} ${p.nom}`, 'Création du dossier patient.');
  }
  for (const a of actes) {
    const p = patients.find((x) => x.id === a.patientId);
    pousser(
      a.creeLe,
      a.praticien,
      'acte.cree',
      a.patientId,
      a.libelle,
      `Acte « ${a.libelle} » ajouté au plan de traitement de ${p ? p.prenom : ''}.`,
      a.dents[0] ?? null,
    );
    if (a.statut === 'realise' && a.dateRealisation) {
      pousser(
        `${a.dateRealisation}T11:00:00.000Z`,
        a.praticien,
        'acte.maj',
        a.patientId,
        a.libelle,
        `Acte « ${a.libelle} » marqué réalisé.`,
        a.dents[0] ?? null,
      );
    }
  }
  for (const f of factures) {
    pousser(f.creeLe, praticien, 'facture.cree', f.patientId, f.numero, `Facture ${f.numero} émise.`);
    for (const pay of f.paiements) {
      pousser(
        `${pay.date}T15:00:00.000Z`,
        praticien,
        'paiement.ajoute',
        f.patientId,
        f.numero,
        `Règlement de ${pay.montant.toFixed(2)} € encaissé sur ${f.numero}.`,
      );
    }
  }
  return evts.sort((a, b) => a.date.localeCompare(b.date));
}
