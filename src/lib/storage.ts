import type { AppData, Patient } from '@/types';
import {
  desceller,
  estEnveloppeChiffree,
  sceller,
  type Coffre,
  type EnveloppeChiffree,
} from '@/lib/crypto';
import { facteursRisqueVides } from '@/data/seed';

export const CLE_STOCKAGE = 'suivi-patient-dentaire:v1';
export const VERSION_DONNEES = 2;

export type Enveloppe =
  | { etat: 'vide' }
  | { etat: 'clair'; data: AppData }
  | { etat: 'chiffre'; enveloppe: EnveloppeChiffree }
  | { etat: 'illisible' };

function lireBrut(): string | null {
  try {
    return localStorage.getItem(CLE_STOCKAGE);
  } catch {
    return null;
  }
}

/** Lit le magasin sans le déchiffrer : indique seulement dans quel état il est. */
export function lireEnveloppe(): Enveloppe {
  const brut = lireBrut();
  if (!brut) return { etat: 'vide' };
  try {
    const parse: unknown = JSON.parse(brut);
    if (estEnveloppeChiffree(parse)) return { etat: 'chiffre', enveloppe: parse };
    const data = parse as AppData;
    if (!data || typeof data !== 'object' || !Array.isArray(data.patients)) return { etat: 'illisible' };
    return { etat: 'clair', data: migrer(data) };
  } catch {
    return { etat: 'illisible' };
  }
}

/** Compatibilité : lecture directe du magasin en clair. */
export function charger(): AppData | null {
  const e = lireEnveloppe();
  return e.etat === 'clair' ? e.data : null;
}

export function sauvegarder(data: AppData): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(data));
  } catch (e) {
    // Quota exceeded or storage disabled: the app keeps working in memory.
    console.warn('Sauvegarde impossible', e);
  }
}

/** Écrit le magasin scellé par le coffre ; le disque ne voit que du chiffré. */
export async function sauvegarderChiffre(data: AppData, coffre: Coffre): Promise<void> {
  const enveloppe = await sceller(JSON.stringify(data), coffre);
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(enveloppe));
  } catch (e) {
    console.warn('Sauvegarde chiffrée impossible', e);
  }
}

export async function ouvrirEnveloppe(enveloppe: EnveloppeChiffree, coffre: Coffre): Promise<AppData> {
  const clair = await desceller(enveloppe, coffre);
  const data = JSON.parse(clair) as AppData;
  if (!data || !Array.isArray(data.patients)) throw new Error('Contenu du coffre illisible.');
  return migrer(data);
}

export function effacer(): void {
  try {
    localStorage.removeItem(CLE_STOCKAGE);
  } catch {
    /* ignore */
  }
}

function migrerPatient(p: Patient): Patient {
  return {
    ...p,
    facteursRisque: { ...facteursRisqueVides(), ...(p.facteursRisque ?? {}) },
    rappelMois: typeof p.rappelMois === 'number' ? p.rappelMois : 6,
    dernierControle: p.dernierControle ?? null,
    allergies: p.allergies ?? [],
    antecedents: p.antecedents ?? [],
    traitementsEnCours: p.traitementsEnCours ?? [],
    alertes: p.alertes ?? [],
  };
}

/** Fills in fields added after the stored payload was written. */
export function migrer(data: AppData): AppData {
  return {
    ...data,
    version: VERSION_DONNEES,
    patients: (data.patients ?? []).map(migrerPatient),
    odontogrammes: data.odontogrammes ?? [],
    actes: data.actes ?? [],
    rendezVous: data.rendezVous ?? [],
    factures: data.factures ?? [],
    notes: data.notes ?? [],
    journal: data.journal ?? [],
    chartingsParo: data.chartingsParo ?? [],
    images: data.images ?? [],
    devis: data.devis ?? [],
    ordonnances: data.ordonnances ?? [],
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
