import type { AppData, Patient } from '@/types';
import {
  desceller,
  estEnveloppeChiffree,
  sceller,
  type Coffre,
  type EnveloppeChiffree,
} from '@/lib/crypto';
import { facteursRisqueVides } from '@/data/seed';
import { NOMENCLATURE_PAR_DEFAUT, nomenclature } from '@/data/nomenclatures';

export const CLE_STOCKAGE = 'suivi-patient-dentaire:v1';
export const VERSION_DONNEES = 6;

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

/** Ancien nom du tarif de référence, avant la gestion multi-nomenclature. */
type AvecAncienneBase = { baseRemboursement?: number };

function migrerTarifReference<T extends { tarifReference?: number }>(ligne: T): T {
  const ancien = (ligne as T & AvecAncienneBase).baseRemboursement;
  if (ligne.tarifReference === undefined && typeof ancien === 'number') {
    return { ...ligne, tarifReference: ancien };
  }
  return ligne;
}

function migrerPatient(p: Patient, regimeParDefaut: string): Patient {
  return {
    ...p,
    regime: p.regime ?? regimeParDefaut,
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
  // Les sauvegardes antérieures à la gestion multi-nomenclature n'ont ni
  // nomenclature ni régime : on les rattache à la CCAM française, qui était
  // alors la seule possible.
  const idNomenclature = data.cabinet?.nomenclature ?? NOMENCLATURE_PAR_DEFAUT;
  const regimeParDefaut = data.cabinet?.regimeParDefaut ?? nomenclature(idNomenclature).regimes[0].id;

  return {
    ...data,
    version: VERSION_DONNEES,
    cabinet: { ...data.cabinet, nomenclature: idNomenclature, regimeParDefaut },
    patients: (data.patients ?? []).map((p) => migrerPatient(p, regimeParDefaut)),
    odontogrammes: data.odontogrammes ?? [],
    actes: (data.actes ?? []).map(migrerTarifReference),
    rendezVous: data.rendezVous ?? [],
    factures: data.factures ?? [],
    notes: data.notes ?? [],
    journal: data.journal ?? [],
    chartingsParo: data.chartingsParo ?? [],
    images: data.images ?? [],
    devis: (data.devis ?? []).map((d) => ({
      ...d,
      variantes: (d.variantes ?? []).map((v) => ({ ...v, lignes: (v.lignes ?? []).map(migrerTarifReference) })),
    })),
    ordonnances: data.ordonnances ?? [],
    // Version 4 : approvisionnement. Les sauvegardes antérieures n'ont ni
    // fournisseurs ni stock ; un cabinet existant part d'une liste vide et
    // la remplit à son rythme, sans qu'on lui impose un catalogue.
    fournisseurs: data.fournisseurs ?? [],
    stock: data.stock ?? [],
    // Version 5 : traçabilité de la stérilisation. Registre vide pour un
    // cabinet existant, qui le remplit à partir de son prochain cycle.
    cycles: data.cycles ?? [],
    utilisationsCycle: data.utilisationsCycle ?? [],
    // Version 6 : ordres de laboratoire et templates de communication.
    ordresLab: data.ordresLab ?? [],
    templatesComm: data.templatesComm ?? templatesCommParDefaut(),
  };
}

/** Templates de communication fournis avec le produit. */
function templatesCommParDefaut() {
  return [
    {
      id: 'tpl-rappel-rdv',
      type: 'rappel_rdv' as const,
      nom: 'Rappel de rendez-vous',
      canal: 'sms' as const,
      sujet: '',
      corps:
        'Bonjour {prenom}, nous vous rappelons votre rendez-vous le {date} à {heure} au cabinet {cabinet}. En cas d’empêchement, merci de nous prévenir. À bientôt.',
      actif: true,
    },
    {
      id: 'tpl-suivi-post',
      type: 'suivi_post_soin' as const,
      nom: 'Suivi post-soin (48h)',
      canal: 'sms' as const,
      sujet: '',
      corps:
        'Bonjour {prenom}, comment allez-vous après votre soin de {date} ? N’hésitez pas à nous contacter si vous avez la moindre question. L’équipe du cabinet {cabinet}.',
      actif: true,
    },
    {
      id: 'tpl-relance-devis',
      type: 'relance_devis' as const,
      nom: 'Relance de devis',
      canal: 'email' as const,
      sujet: 'Suite à votre consultation – devis',
      corps:
        'Bonjour {prenom},\n\nNous revenons vers vous concernant le devis qui vous a été remis. Nous restons à votre disposition pour toute question.\n\nCordialement,\n{cabinet}',
      actif: true,
    },
    {
      id: 'tpl-rappel-controle',
      type: 'rappel_controle' as const,
      nom: 'Rappel de contrôle',
      canal: 'sms' as const,
      sujet: '',
      corps:
        'Bonjour {prenom}, il est temps de planifier votre contrôle dentaire. Contactez-nous pour prendre rendez-vous. Cabinet {cabinet}.',
      actif: true,
    },
  ];
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
