import type { CycleSterilisation, TypeSterilisateur, UtilisationCycle } from '@/types';

/**
 * Traçabilité de la stérilisation.
 *
 * Un registre de cycles ne vaut que par le lien qu'il garde avec les
 * patients. Toute la logique ci-dessous sert une seule question : quand un
 * cycle se révèle non conforme, qui a reçu ses instruments ?
 */

export const LIBELLE_STERILISATEUR: Record<TypeSterilisateur, string> = {
  autoclave_b: 'Autoclave classe B',
  autoclave_s: 'Autoclave classe S',
  autoclave_n: 'Autoclave classe N',
  chaleur_seche: 'Chaleur sèche',
};

export const TYPES_STERILISATEUR = Object.keys(LIBELLE_STERILISATEUR) as TypeSterilisateur[];

export type StatutCycle = 'conforme' | 'non_conforme' | 'invalide';

export const LIBELLE_STATUT: Record<StatutCycle, string> = {
  conforme: 'Conforme',
  non_conforme: 'Non conforme',
  invalide: 'Invalidé après coup',
};

/**
 * Statut d'un cycle.
 *
 * L'invalidation rétrospective prime sur tout le reste : un cycle dont le
 * test de spores revient positif est non conforme, quels qu'aient été ses
 * indicateurs le jour même.
 */
export function statutCycle(c: CycleSterilisation): StatutCycle {
  if (c.invalideLe) return 'invalide';
  if (!c.indicateurPhysique || !c.indicateurChimique) return 'non_conforme';
  if (c.indicateurBiologique === false) return 'non_conforme';
  return 'conforme';
}

export function cycleUtilisable(c: CycleSterilisation): boolean {
  return statutCycle(c) === 'conforme';
}

/**
 * Motif de non-conformité, en clair.
 *
 * « Non conforme » sans raison oblige à rouvrir la fiche. Le registre doit
 * se lire d'un coup d'œil, y compris par un inspecteur.
 */
export function motifNonConformite(c: CycleSterilisation): string {
  if (c.invalideLe) return c.motifInvalidation || 'Invalidé après enregistrement.';
  const manques: string[] = [];
  if (!c.indicateurPhysique) manques.push('enregistrement du cycle');
  if (!c.indicateurChimique) manques.push('intégrateur chimique');
  if (c.indicateurBiologique === false) manques.push('test biologique positif');
  if (manques.length === 0) return '';
  return `Manque ou échec : ${manques.join(', ')}.`;
}

/** Numéro de cycle déjà employé ? Il est porté sur les sachets, il doit être unique. */
export function numeroDejaPris(cycles: CycleSterilisation[], numero: string, saufId?: string): boolean {
  const cherche = numero.trim().toLowerCase();
  if (!cherche) return false;
  return cycles.some((c) => c.id !== saufId && c.numero.trim().toLowerCase() === cherche);
}

export interface RappelSterilisation {
  cycle: CycleSterilisation;
  motif: string;
  patientIds: string[];
  utilisations: UtilisationCycle[];
}

/**
 * Patients exposés à un cycle non conforme.
 *
 * Le cœur du module. Un cycle non conforme dont aucune charge n'a servi ne
 * demande rien de plus qu'une relance de cycle ; un cycle non conforme déjà
 * employé impose de rappeler des patients.
 */
export function rappelsNecessaires(
  cycles: CycleSterilisation[],
  utilisations: UtilisationCycle[],
): RappelSterilisation[] {
  return cycles
    .filter((c) => statutCycle(c) !== 'conforme')
    .map((cycle) => {
      const liees = utilisations.filter((u) => u.cycleId === cycle.id);
      return {
        cycle,
        motif: motifNonConformite(cycle),
        patientIds: [...new Set(liees.map((u) => u.patientId))],
        utilisations: liees,
      };
    })
    .sort((a, b) => b.cycle.date.localeCompare(a.cycle.date));
}

/** Cycles non conformes ayant effectivement servi : ceux qui imposent une action. */
export function rappelsAvecPatients(
  cycles: CycleSterilisation[],
  utilisations: UtilisationCycle[],
): RappelSterilisation[] {
  return rappelsNecessaires(cycles, utilisations).filter((r) => r.patientIds.length > 0);
}

/** Cycles dont un patient donné a reçu les instruments. */
export function cyclesDuPatient(
  patientId: string,
  cycles: CycleSterilisation[],
  utilisations: UtilisationCycle[],
): CycleSterilisation[] {
  const ids = new Set(utilisations.filter((u) => u.patientId === patientId).map((u) => u.cycleId));
  return cycles.filter((c) => ids.has(c.id)).sort((a, b) => b.date.localeCompare(a.date));
}

export interface BilanSterilisation {
  total: number;
  conformes: number;
  aTraiter: number;
  patientsARappeler: number;
  /** Part de cycles conformes, en pourcentage, ou null sans aucun cycle. */
  tauxConformite: number | null;
}

export function bilan(
  cycles: CycleSterilisation[],
  utilisations: UtilisationCycle[],
): BilanSterilisation {
  const conformes = cycles.filter(cycleUtilisable).length;
  const rappels = rappelsAvecPatients(cycles, utilisations);
  const patients = new Set(rappels.flatMap((r) => r.patientIds));
  return {
    total: cycles.length,
    conformes,
    aTraiter: rappels.length,
    patientsARappeler: patients.size,
    tauxConformite: cycles.length ? Math.round((conformes / cycles.length) * 100) : null,
  };
}

/**
 * Paramètres attendus selon le procédé.
 *
 * Repères usuels, pas une validation : un cycle hors de ces valeurs est
 * signalé pour relecture, jamais refusé. C'est le praticien qui connaît son
 * appareil, pas le logiciel.
 */
export const REPERES: Record<TypeSterilisateur, { temperature: number; duree: number }> = {
  autoclave_b: { temperature: 134, duree: 18 },
  autoclave_s: { temperature: 134, duree: 18 },
  autoclave_n: { temperature: 134, duree: 18 },
  chaleur_seche: { temperature: 180, duree: 30 },
};

export function ecartAuxReperes(c: CycleSterilisation): string {
  const r = REPERES[c.type];
  if (!r) return '';
  const ecarts: string[] = [];
  if (c.temperature < r.temperature) ecarts.push(`température sous ${r.temperature} °C`);
  if (c.dureePalier < r.duree) ecarts.push(`palier sous ${r.duree} min`);
  return ecarts.length ? `À relire : ${ecarts.join(', ')}.` : '';
}
