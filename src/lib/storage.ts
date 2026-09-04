import type { AppData } from '@/types';

export const CLE_STOCKAGE = 'suivi-patient-dentaire:v1';
export const VERSION_DONNEES = 1;

/** Reads persisted state; returns null when absent or unusable. */
export function charger(): AppData | null {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return null;
    const data = JSON.parse(brut) as AppData;
    if (!data || typeof data !== 'object' || !Array.isArray(data.patients)) return null;
    return migrer(data);
  } catch {
    return null;
  }
}

export function sauvegarder(data: AppData): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(data));
  } catch (e) {
    // Quota exceeded or storage disabled: the app keeps working in memory.
    console.warn('Sauvegarde impossible', e);
  }
}

export function effacer(): void {
  try {
    localStorage.removeItem(CLE_STOCKAGE);
  } catch {
    /* ignore */
  }
}

/** Fills in fields added after the stored payload was written. */
export function migrer(data: AppData): AppData {
  return {
    ...data,
    version: VERSION_DONNEES,
    odontogrammes: data.odontogrammes ?? [],
    actes: data.actes ?? [],
    rendezVous: data.rendezVous ?? [],
    factures: data.factures ?? [],
    notes: data.notes ?? [],
  };
}

export function exporterJSON(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** Parses an exported file; throws a readable error when the payload is wrong. */
export function importerJSON(texte: string): AppData {
  const data = JSON.parse(texte) as AppData;
  if (!data || typeof data !== 'object') throw new Error('Fichier illisible.');
  if (!Array.isArray(data.patients)) throw new Error('Fichier invalide : liste des patients absente.');
  if (!data.cabinet) throw new Error('Fichier invalide : informations du cabinet absentes.');
  return migrer(data);
}

export function telecharger(nomFichier: string, contenu: string, type = 'application/json'): void {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
