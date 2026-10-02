import type { DentEtat, EvenementJournal } from '@/types';

/**
 * Reconstruction du dossier à partir du journal.
 *
 * Comme chaque modification du schéma dentaire est inscrite au journal avec
 * l'état avant et après, on peut rejouer la bouche telle qu'elle était à
 * n'importe quelle date, et retracer la vie complète d'une dent.
 */

function trierParDate(journal: EvenementJournal[]): EvenementJournal[] {
  return [...journal].sort((a, b) => a.date.localeCompare(b.date));
}

/** État du schéma dentaire d'un patient tel qu'il était à la date donnée. */
export function odontogrammeADate(
  journal: EvenementJournal[],
  patientId: string,
  date: string,
): Record<number, DentEtat> {
  const etats = new Map<number, DentEtat>();
  for (const e of trierParDate(journal)) {
    if (e.patientId !== patientId || e.dent === null) continue;
    if (e.date > date) break;
    if (e.type === 'dent.maj' && e.apres) {
      etats.set(e.dent, e.apres as DentEtat);
    } else if (e.type === 'dent.reset') {
      etats.delete(e.dent);
    }
  }
  return Object.fromEntries(etats);
}

/** Dates auxquelles le schéma dentaire a changé, de la plus ancienne à la plus récente. */
export function datesClesSchema(journal: EvenementJournal[], patientId: string): string[] {
  const dates = trierParDate(journal)
    .filter((e) => e.patientId === patientId && (e.type === 'dent.maj' || e.type === 'dent.reset'))
    .map((e) => e.date);
  return Array.from(new Set(dates));
}

/** Tous les événements concernant une dent, du plus récent au plus ancien. */
export function biographieDent(
  journal: EvenementJournal[],
  patientId: string,
  numero: number,
): EvenementJournal[] {
  return trierParDate(journal)
    .filter((e) => e.patientId === patientId && e.dent === numero)
    .reverse();
}

/** Journal d'un patient, du plus récent au plus ancien. */
export function journalPatient(journal: EvenementJournal[], patientId: string): EvenementJournal[] {
  return trierParDate(journal)
    .filter((e) => e.patientId === patientId)
    .reverse();
}

export interface SegmentActivite {
  /** Clé AAAA-MM. */
  mois: string;
  nombre: number;
}

/** Activité mensuelle du journal, pour situer les périodes de soin. */
export function activiteMensuelle(journal: EvenementJournal[], patientId: string): SegmentActivite[] {
  const parMois = new Map<string, number>();
  for (const e of journal) {
    if (e.patientId !== patientId) continue;
    const mois = e.date.slice(0, 7);
    parMois.set(mois, (parMois.get(mois) ?? 0) + 1);
  }
  return [...parMois.entries()]
    .map(([mois, nombre]) => ({ mois, nombre }))
    .sort((a, b) => a.mois.localeCompare(b.mois));
}
