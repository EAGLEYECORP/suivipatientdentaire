import type { Acte, ChartingParo, DentEtat, Patient } from '@/types';
import { calculerIndices } from '@/data/perio';
import { normaliser } from '@/lib/utils';
import { age } from '@/lib/utils';

/**
 * Aide à la décision clinique.
 *
 * Toutes les règles sont déterministes, lisibles et motivées : chaque alerte
 * dit quelle donnée du dossier l'a déclenchée et quelle conduite elle suggère.
 * Rien n'est automatisé à la place du praticien, qui reste seul décisionnaire.
 */

export type Severite = 'critique' | 'elevee' | 'moderee' | 'info';

export type CategorieAlerte = 'securite' | 'clinique' | 'organisation';

export interface Alerte {
  /** Identifiant stable de la règle, utile pour les tests et le filtrage. */
  regle: string;
  severite: Severite;
  categorie: CategorieAlerte;
  titre: string;
  /** Ce qui, dans le dossier, a déclenché la règle. */
  declencheur: string;
  conduite: string;
  dents: number[];
}

const ORDRE_SEVERITE: Record<Severite, number> = { critique: 0, elevee: 1, moderee: 2, info: 3 };

function contient(liste: string[], ...motifs: string[]): string | null {
  for (const item of liste) {
    const n = normaliser(item);
    for (const m of motifs) {
      if (n.includes(normaliser(m))) return item;
    }
  }
  return null;
}

/** Actes impliquant un saignement significatif ou une effraction osseuse. */
const ACTES_CHIRURGICAUX = ['HBGD036', 'HBGD017', 'LBLD010'];
const ACTES_SANGLANTS = [...ACTES_CHIRURGICAUX, 'HBJD001', 'HBBD490', 'HBBD351', 'HBBD006'];

export interface ContexteDecision {
  patient: Patient;
  actes: Acte[];
  dents: DentEtat[];
  charting?: ChartingParo;
  /** Date de référence, injectable pour les tests. */
  aujourdHui?: Date;
}

export function evaluerAlertes(ctx: ContexteDecision): Alerte[] {
  const { patient, actes, dents } = ctx;
  const maintenant = ctx.aujourdHui ?? new Date();
  const alertes: Alerte[] = [];
  const aVenir = actes.filter((a) => a.statut === 'planifie' || a.statut === 'en_cours');
  const medicaments = [...patient.traitementsEnCours, ...patient.antecedents, ...patient.alertes];

  const chirurgie = aVenir.filter((a) => ACTES_CHIRURGICAUX.includes(a.codeActe));
  const sanglants = aVenir.filter((a) => ACTES_SANGLANTS.includes(a.codeActe));

  /* --- Sécurité : hémostase ------------------------------------------- */
  const anticoagulant = contient(
    medicaments,
    'anticoagulant',
    'kardegic',
    'warfarine',
    'coumadine',
    'previscan',
    'xarelto',
    'eliquis',
    'plavix',
    'clopidogrel',
    'aspirine',
    'antiagregant',
  );
  if (anticoagulant && sanglants.length > 0) {
    alertes.push({
      regle: 'hemostase.anticoagulant',
      severite: 'critique',
      categorie: 'securite',
      titre: 'Risque hémorragique',
      declencheur: `Traitement anticoagulant ou antiagrégant au dossier (« ${anticoagulant} ») et ${sanglants.length} acte(s) sanglant(s) programmé(s).`,
      conduite:
        'Vérifier l’INR récent ou l’indication, prévoir une hémostase locale renforcée et ne jamais interrompre le traitement sans avis du prescripteur.',
      dents: sanglants.flatMap((a) => a.dents),
    });
  }

  /* --- Sécurité : ostéonécrose ---------------------------------------- */
  const antiresorptif = contient(
    medicaments,
    'bisphosphonate',
    'zoledronique',
    'alendronate',
    'denosumab',
    'prolia',
    'xgeva',
    'romosozumab',
  );
  if (antiresorptif && chirurgie.length > 0) {
    alertes.push({
      regle: 'mronj.antiresorptif',
      severite: 'critique',
      categorie: 'securite',
      titre: 'Risque d’ostéonécrose des mâchoires',
      declencheur: `Traitement antirésorptif au dossier (« ${antiresorptif} ») et ${chirurgie.length} acte(s) chirurgical/aux programmé(s).`,
      conduite:
        'Privilégier une alternative conservatrice, sinon chirurgie a minima sous antibioprophylaxie, après avis du prescripteur et information écrite du patient.',
      dents: chirurgie.flatMap((a) => a.dents),
    });
  }

  /* --- Sécurité : allergies ------------------------------------------- */
  const allergieAnesthesique = contient(patient.allergies, 'articaine', 'lidocaine', 'anesthesique', 'amide');
  if (allergieAnesthesique && aVenir.length > 0) {
    alertes.push({
      regle: 'allergie.anesthesique',
      severite: 'elevee',
      categorie: 'securite',
      titre: 'Allergie à un anesthésique local',
      declencheur: `Allergie déclarée : « ${allergieAnesthesique} », avec des actes programmés sous anesthésie.`,
      conduite: 'Choisir une molécule d’une autre famille et le noter au plan de traitement avant la séance.',
      dents: [],
    });
  }
  const allergieBetalactamine = contient(patient.allergies, 'penicilline', 'amoxicilline', 'betalactamine');
  if (allergieBetalactamine) {
    alertes.push({
      regle: 'allergie.betalactamine',
      severite: 'moderee',
      categorie: 'securite',
      titre: 'Allergie aux bêta-lactamines',
      declencheur: `Allergie déclarée : « ${allergieBetalactamine} ».`,
      conduite: 'Toute antibiothérapie ou antibioprophylaxie doit utiliser une alternative (macrolide, clindamycine).',
      dents: [],
    });
  }
  const allergieLatex = contient(patient.allergies, 'latex');
  if (allergieLatex) {
    alertes.push({
      regle: 'allergie.latex',
      severite: 'moderee',
      categorie: 'securite',
      titre: 'Allergie au latex',
      declencheur: 'Allergie au latex déclarée au dossier.',
      conduite: 'Préparer la salle en matériel sans latex (gants, digue, élastiques) avant l’arrivée du patient.',
      dents: [],
    });
  }

  /* --- Sécurité : endocardite ------------------------------------------ */
  const cardiopathie = contient(
    medicaments,
    'endocardite',
    'valve',
    'prothese valvulaire',
    'cardiopathie congenitale',
    'rhumatisme articulaire',
  );
  if (cardiopathie && sanglants.length > 0) {
    alertes.push({
      regle: 'endocardite.prophylaxie',
      severite: 'critique',
      categorie: 'securite',
      titre: 'Antibioprophylaxie de l’endocardite infectieuse',
      declencheur: `Cardiopathie à haut risque au dossier (« ${cardiopathie} ») et geste sanglant programmé.`,
      conduite: 'Prescrire l’antibioprophylaxie en dose unique une heure avant le geste, selon le protocole en vigueur.',
      dents: [],
    });
  }

  /* --- Clinique : cicatrisation ---------------------------------------- */
  if (patient.facteursRisque.diabete === 'desequilibre' && chirurgie.length > 0) {
    alertes.push({
      regle: 'cicatrisation.diabete',
      severite: 'elevee',
      categorie: 'clinique',
      titre: 'Diabète déséquilibré avant chirurgie',
      declencheur: 'Diabète noté déséquilibré et acte chirurgical programmé.',
      conduite: 'Demander une HbA1c récente ; différer si possible jusqu’à l’équilibration, sinon renforcer le suivi.',
      dents: chirurgie.flatMap((a) => a.dents),
    });
  }
  const implants = aVenir.filter((a) => a.codeActe === 'LBLD010');
  if (patient.facteursRisque.tabac === 'dix_ou_plus' && implants.length > 0) {
    alertes.push({
      regle: 'implant.tabac',
      severite: 'moderee',
      categorie: 'clinique',
      titre: 'Tabagisme et pose d’implant',
      declencheur: 'Tabagisme ≥ 10 cigarettes par jour et implant programmé.',
      conduite: 'Informer du surrisque d’échec et de péri-implantite, proposer un sevrage encadré avant la pose.',
      dents: implants.flatMap((a) => a.dents),
    });
  }
  if (patient.facteursRisque.grossesse) {
    alertes.push({
      regle: 'grossesse',
      severite: 'moderee',
      categorie: 'securite',
      titre: 'Patiente enceinte',
      declencheur: 'Grossesse en cours signalée au dossier.',
      conduite:
        'Limiter la radiographie au strict nécessaire avec tablier plombé, privilégier le deuxième trimestre et vérifier chaque prescription.',
      dents: [],
    });
  }

  /* --- Clinique : lésions non prises en charge -------------------------- */
  const dentsAvecActe = new Set(aVenir.flatMap((a) => a.dents));
  const cariesNonTraitees = dents
    .filter((d) => d.etat === 'carie' && !dentsAvecActe.has(d.numero))
    .map((d) => d.numero);
  if (cariesNonTraitees.length > 0) {
    alertes.push({
      regle: 'lesion.carie_sans_acte',
      severite: 'elevee',
      categorie: 'clinique',
      titre: 'Caries sans acte programmé',
      declencheur: `Carie relevée sur ${cariesNonTraitees.join(', ')} sans soin inscrit au plan de traitement.`,
      conduite: 'Programmer le soin ou tracer la décision de surveillance dans les notes cliniques.',
      dents: cariesNonTraitees,
    });
  }
  const aExtraireSansActe = dents
    .filter((d) => d.etat === 'a_extraire' && !dentsAvecActe.has(d.numero))
    .map((d) => d.numero);
  if (aExtraireSansActe.length > 0) {
    alertes.push({
      regle: 'lesion.extraction_sans_acte',
      severite: 'moderee',
      categorie: 'clinique',
      titre: 'Avulsion à programmer',
      declencheur: `Dent(s) marquée(s) à extraire sans acte correspondant : ${aExtraireSansActe.join(', ')}.`,
      conduite: 'Inscrire l’avulsion au plan de traitement ou réviser l’indication.',
      dents: aExtraireSansActe,
    });
  }

  /* --- Clinique : dent dépulpée non protégée ---------------------------- */
  const depulpeesNonCouronnees = dents
    .filter((d) => d.etat === 'endodontie')
    .filter((d) => {
      const couronnePrevue = actes.some(
        (a) => a.dents.includes(d.numero) && a.codeActe.startsWith('HBLD') && a.statut !== 'annule',
      );
      return !couronnePrevue;
    })
    .map((d) => d.numero)
    .filter((n) => n % 10 >= 4); // secteurs prémolaire et molaire, soumis aux forces occlusales
  if (depulpeesNonCouronnees.length > 0) {
    alertes.push({
      regle: 'endodontie.sans_coiffe',
      severite: 'moderee',
      categorie: 'clinique',
      titre: 'Dent dépulpée postérieure non protégée',
      declencheur: `Traitement endodontique sur ${depulpeesNonCouronnees.join(', ')} sans restauration coronoperiphérique prévue.`,
      conduite: 'Évaluer l’indication d’une coiffe : le risque de fracture d’une dent postérieure dépulpée est majeur.',
      dents: depulpeesNonCouronnees,
    });
  }

  /* --- Organisation : rappel dépassé ------------------------------------ */
  if (patient.rappelMois > 0 && patient.dernierControle) {
    const prochain = new Date(`${patient.dernierControle}T00:00:00`);
    prochain.setMonth(prochain.getMonth() + patient.rappelMois);
    if (prochain < maintenant) {
      const retard = Math.floor((maintenant.getTime() - prochain.getTime()) / (30 * 86400000));
      alertes.push({
        regle: 'rappel.depasse',
        severite: retard >= 6 ? 'moderee' : 'info',
        categorie: 'organisation',
        titre: 'Visite de contrôle dépassée',
        declencheur: `Dernier contrôle le ${patient.dernierControle}, rappel prévu tous les ${patient.rappelMois} mois : ${retard} mois de retard.`,
        conduite: 'Recontacter le patient pour programmer son examen de contrôle.',
        dents: [],
      });
    }
  }

  return alertes.sort((a, b) => ORDRE_SEVERITE[a.severite] - ORDRE_SEVERITE[b.severite]);
}

/* ------------------------------------------------------------------ *
 * Risque carieux (approche CAMBRA)
 * ------------------------------------------------------------------ */

export type NiveauRisque = 'faible' | 'modere' | 'eleve' | 'extreme';

export interface EvaluationRisque {
  niveau: NiveauRisque;
  /** Signes de maladie active. */
  indicateurs: string[];
  /** Facteurs favorisants. */
  facteurs: string[];
  /** Éléments protecteurs présents. */
  protecteurs: string[];
  recommandations: string[];
  /** Intervalle de rappel conseillé, en mois. */
  intervalleRappelMois: number;
}

/**
 * Évaluation du risque carieux individuel, dans l'esprit de CAMBRA : on
 * distingue les indicateurs de maladie (lésions actives) des facteurs de
 * risque, et on tient compte des éléments protecteurs.
 */
export function evaluerRisqueCarieux(patient: Patient, dents: DentEtat[]): EvaluationRisque {
  const indicateurs: string[] = [];
  const facteurs: string[] = [];
  const protecteurs: string[] = [];

  const caries = dents.filter((d) => d.etat === 'carie');
  if (caries.length > 0) {
    indicateurs.push(`${caries.length} lésion(s) carieuse(s) active(s) : ${caries.map((d) => d.numero).join(', ')}.`);
  }
  const restaurations = dents.filter((d) => d.etat === 'obturation');
  if (restaurations.length >= 3) {
    indicateurs.push(`${restaurations.length} dents restaurées : antécédent carieux marqué.`);
  }

  const r = patient.facteursRisque;
  if (r.grignotageSucre) facteurs.push('Prises alimentaires sucrées répétées dans la journée.');
  if (r.boucheSeche) facteurs.push('Hyposialie (bouche sèche) : pouvoir tampon salivaire diminué.');
  if (r.hygieneInsuffisante) facteurs.push('Contrôle de plaque insuffisant.');
  if (r.appareillage) facteurs.push('Appareillage rétenteur de plaque (orthodontie ou prothèse).');
  if (r.tabac !== 'non') facteurs.push('Tabagisme actif.');
  if (r.diabete !== 'non') facteurs.push('Diabète.');

  if (r.expositionFluor) protecteurs.push('Exposition régulière au fluor.');
  if (!r.hygieneInsuffisante) protecteurs.push('Hygiène bucco-dentaire jugée satisfaisante.');

  let niveau: NiveauRisque;
  if (caries.length > 0 && r.boucheSeche) niveau = 'extreme';
  else if (caries.length > 0 || facteurs.length >= 3) niveau = 'eleve';
  else if (facteurs.length >= 1 || indicateurs.length > 0) niveau = 'modere';
  else niveau = 'faible';

  // Un terrain protégé fait redescendre d'un cran un risque purement théorique.
  if (niveau === 'modere' && indicateurs.length === 0 && protecteurs.length === 2 && facteurs.length === 1) {
    niveau = 'faible';
  }

  const recommandations: string[] = [];
  if (niveau === 'extreme' || niveau === 'eleve') {
    recommandations.push('Dentifrice fluoré à haute teneur (5 000 ppm) et vernis fluoré trimestriel.');
    recommandations.push('Contrôle de plaque réévalué à chaque séance, avec démonstration au fauteuil.');
  }
  if (r.boucheSeche) recommandations.push('Substituts salivaires et stimulation salivaire ; revoir les traitements xérogènes.');
  if (r.grignotageSucre) recommandations.push('Limiter les prises sucrées à moins de trois par jour.');
  if (r.appareillage) recommandations.push('Brossettes interdentaires et bains de bouche fluorés pendant le port de l’appareil.');
  if (niveau === 'faible') recommandations.push('Maintenir le brossage fluoré biquotidien et le fil dentaire.');

  const intervalle = { extreme: 3, eleve: 4, modere: 6, faible: 12 }[niveau];

  return { niveau, indicateurs, facteurs, protecteurs, recommandations, intervalleRappelMois: intervalle };
}

/* ------------------------------------------------------------------ *
 * Risque parodontal (profil à six vecteurs, d'après Lang & Tonetti)
 * ------------------------------------------------------------------ */

export interface VecteurRisque {
  nom: string;
  valeur: string;
  niveau: 'faible' | 'modere' | 'eleve';
}

export interface RisqueParodontal {
  niveau: NiveauRisque;
  vecteurs: VecteurRisque[];
  intervalleRappelMois: number;
  commentaire: string;
}

/**
 * Profil de risque parodontal individuel : six vecteurs cotés séparément,
 * puis une synthèse. C'est ce profil, et non la seule sévérité passée, qui
 * détermine la fréquence de la maintenance.
 */
export function evaluerRisqueParodontal(
  patient: Patient,
  charting: ChartingParo | undefined,
  dents: DentEtat[],
): RisqueParodontal {
  const absentes = dents.filter((d) => d.etat === 'absente').map((d) => d.numero);
  const vecteurs: VecteurRisque[] = [];

  if (charting) {
    const i = calculerIndices(charting, absentes);
    vecteurs.push({
      nom: 'Saignement au sondage',
      valeur: `${i.bopPct} %`,
      niveau: i.bopPct <= 9 ? 'faible' : i.bopPct <= 25 ? 'modere' : 'eleve',
    });

    const poches5 = charting.dents
      .filter((d) => !absentes.includes(d.numero))
      .reduce(
        (n, d) => n + Object.values(d.sites).filter((s) => (s.pd ?? 0) >= 5).length,
        0,
      );
    vecteurs.push({
      nom: 'Poches résiduelles ≥ 5 mm',
      valeur: `${poches5} site(s)`,
      niveau: poches5 <= 4 ? 'faible' : poches5 <= 8 ? 'modere' : 'eleve',
    });

    const ans = age(patient.dateNaissance);
    if (charting.perteOsseusePct !== null && ans > 0) {
      const ratio = charting.perteOsseusePct / ans;
      vecteurs.push({
        nom: 'Perte osseuse rapportée à l’âge',
        valeur: ratio.toFixed(2),
        niveau: ratio <= 0.5 ? 'faible' : ratio <= 1 ? 'modere' : 'eleve',
      });
    }
  }

  vecteurs.push({
    nom: 'Dents absentes',
    valeur: `${absentes.length}`,
    niveau: absentes.length <= 4 ? 'faible' : absentes.length <= 8 ? 'modere' : 'eleve',
  });

  vecteurs.push({
    nom: 'Tabac',
    valeur:
      patient.facteursRisque.tabac === 'non'
        ? 'Non fumeur'
        : patient.facteursRisque.tabac === 'moins_10'
          ? '< 10 cig./jour'
          : '≥ 10 cig./jour',
    niveau:
      patient.facteursRisque.tabac === 'non'
        ? 'faible'
        : patient.facteursRisque.tabac === 'moins_10'
          ? 'modere'
          : 'eleve',
  });

  vecteurs.push({
    nom: 'Terrain systémique',
    valeur:
      patient.facteursRisque.diabete === 'non'
        ? 'Sans particularité'
        : patient.facteursRisque.diabete === 'equilibre'
          ? 'Diabète équilibré'
          : 'Diabète déséquilibré',
    niveau:
      patient.facteursRisque.diabete === 'non'
        ? 'faible'
        : patient.facteursRisque.diabete === 'equilibre'
          ? 'modere'
          : 'eleve',
  });

  const eleves = vecteurs.filter((v) => v.niveau === 'eleve').length;
  const moderes = vecteurs.filter((v) => v.niveau === 'modere').length;

  let niveau: NiveauRisque;
  if (eleves >= 2) niveau = 'eleve';
  else if (eleves === 1 || moderes >= 2) niveau = 'modere';
  else niveau = 'faible';

  const intervalle = { eleve: 3, modere: 6, faible: 12, extreme: 3 }[niveau];

  return {
    niveau,
    vecteurs,
    intervalleRappelMois: intervalle,
    commentaire: charting
      ? `${eleves} vecteur(s) à risque élevé et ${moderes} à risque modéré sur ${vecteurs.length}.`
      : 'Aucun sondage parodontal : profil établi sur les seuls facteurs généraux.',
  };
}

export const LIBELLE_NIVEAU: Record<NiveauRisque, string> = {
  faible: 'faible',
  modere: 'modéré',
  eleve: 'élevé',
  extreme: 'extrême',
};

/** Intervalle de rappel conseillé : le plus court des deux profils de risque. */
export function intervalleRappelConseille(
  carie: EvaluationRisque,
  parodontal: RisqueParodontal,
): { mois: number; motif: string } {
  if (carie.intervalleRappelMois <= parodontal.intervalleRappelMois) {
    return { mois: carie.intervalleRappelMois, motif: `risque carieux ${LIBELLE_NIVEAU[carie.niveau]}` };
  }
  return {
    mois: parodontal.intervalleRappelMois,
    motif: `risque parodontal ${LIBELLE_NIVEAU[parodontal.niveau]}`,
  };
}
