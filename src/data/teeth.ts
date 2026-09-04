import type { Dentition, EtatDent, Face } from '@/types';

/** FDI (ISO 3950) quadrant layout, ordered from the patient's right to left. */
export const ARCADE_SUP_PERM = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const ARCADE_INF_PERM = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ARCADE_SUP_TEMP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const ARCADE_INF_TEMP = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export function arcades(dentition: Dentition): { haut: number[]; bas: number[] } {
  return dentition === 'permanente'
    ? { haut: ARCADE_SUP_PERM, bas: ARCADE_INF_PERM }
    : { haut: ARCADE_SUP_TEMP, bas: ARCADE_INF_TEMP };
}

export function toutesLesDents(dentition: Dentition): number[] {
  const { haut, bas } = arcades(dentition);
  return [...haut, ...bas];
}

export function estDentTemporaire(numero: number): boolean {
  const q = Math.floor(numero / 10);
  return q >= 5 && q <= 8;
}

export function quadrant(numero: number): number {
  return Math.floor(numero / 10);
}

/** Position within the quadrant, 1 = closest to the midline. */
export function position(numero: number): number {
  return numero % 10;
}

export function estMaxillaire(numero: number): boolean {
  const q = quadrant(numero);
  return q === 1 || q === 2 || q === 5 || q === 6;
}

export function estDroite(numero: number): boolean {
  const q = quadrant(numero);
  return q === 1 || q === 4 || q === 5 || q === 8;
}

const NOMS_PERM: Record<number, string> = {
  1: 'Incisive centrale',
  2: 'Incisive latérale',
  3: 'Canine',
  4: '1re prémolaire',
  5: '2e prémolaire',
  6: '1re molaire',
  7: '2e molaire',
  8: '3e molaire (dent de sagesse)',
};

const NOMS_TEMP: Record<number, string> = {
  1: 'Incisive centrale temporaire',
  2: 'Incisive latérale temporaire',
  3: 'Canine temporaire',
  4: '1re molaire temporaire',
  5: '2e molaire temporaire',
};

export function nomDent(numero: number): string {
  const p = position(numero);
  const base = estDentTemporaire(numero) ? NOMS_TEMP[p] : NOMS_PERM[p];
  if (!base) return `Dent ${numero}`;
  const cote = estDroite(numero) ? 'droite' : 'gauche';
  const arcade = estMaxillaire(numero) ? 'maxillaire' : 'mandibulaire';
  return `${base} ${arcade} ${cote}`;
}

export type TypeDent = 'incisive' | 'canine' | 'premolaire' | 'molaire';

export function typeDent(numero: number): TypeDent {
  const p = position(numero);
  if (estDentTemporaire(numero)) {
    if (p <= 2) return 'incisive';
    if (p === 3) return 'canine';
    return 'molaire';
  }
  if (p <= 2) return 'incisive';
  if (p === 3) return 'canine';
  if (p <= 5) return 'premolaire';
  return 'molaire';
}

/** Anterior teeth have an incisal edge instead of an occlusal surface. */
export function facesDisponibles(numero: number): Face[] {
  const t = typeDent(numero);
  return t === 'incisive' || t === 'canine' ? ['M', 'D', 'V', 'L'] : ['M', 'D', 'V', 'L', 'O'];
}

export const LIBELLE_FACE: Record<Face, string> = {
  M: 'Mésiale',
  D: 'Distale',
  V: 'Vestibulaire',
  L: 'Linguale / palatine',
  O: 'Occlusale',
};

export interface EtatMeta {
  libelle: string;
  couleur: string;
  texte: string;
  bordure: string;
  /** Tailwind classes for legend chips and badges. */
  chip: string;
}

export const ETATS: Record<EtatDent, EtatMeta> = {
  saine: {
    libelle: 'Saine',
    couleur: '#ffffff',
    texte: '#334155',
    bordure: '#cbd5e1',
    chip: 'bg-white text-slate-600 border-slate-300',
  },
  carie: {
    libelle: 'Carie',
    couleur: '#ef4444',
    texte: '#ffffff',
    bordure: '#b91c1c',
    chip: 'bg-red-500 text-white border-red-600',
  },
  obturation: {
    libelle: 'Obturation',
    couleur: '#3b82f6',
    texte: '#ffffff',
    bordure: '#1d4ed8',
    chip: 'bg-blue-500 text-white border-blue-600',
  },
  couronne: {
    libelle: 'Couronne',
    couleur: '#f59e0b',
    texte: '#3f2d00',
    bordure: '#b45309',
    chip: 'bg-amber-500 text-amber-950 border-amber-600',
  },
  implant: {
    libelle: 'Implant',
    couleur: '#8b5cf6',
    texte: '#ffffff',
    bordure: '#6d28d9',
    chip: 'bg-violet-500 text-white border-violet-600',
  },
  bridge: {
    libelle: 'Bridge',
    couleur: '#14b8a6',
    texte: '#04302c',
    bordure: '#0f766e',
    chip: 'bg-teal-500 text-teal-950 border-teal-600',
  },
  absente: {
    libelle: 'Absente',
    couleur: '#94a3b8',
    texte: '#ffffff',
    bordure: '#475569',
    chip: 'bg-slate-400 text-white border-slate-500',
  },
  a_extraire: {
    libelle: 'À extraire',
    couleur: '#f43f5e',
    texte: '#ffffff',
    bordure: '#be123c',
    chip: 'bg-rose-500 text-white border-rose-600',
  },
  endodontie: {
    libelle: 'Traitement de canal',
    couleur: '#22c55e',
    texte: '#052e16',
    bordure: '#15803d',
    chip: 'bg-green-500 text-green-950 border-green-600',
  },
  fracture: {
    libelle: 'Fracture',
    couleur: '#eab308',
    texte: '#422006',
    bordure: '#a16207',
    chip: 'bg-yellow-400 text-yellow-950 border-yellow-500',
  },
  mobile: {
    libelle: 'Mobilité',
    couleur: '#fb923c',
    texte: '#431407',
    bordure: '#c2410c',
    chip: 'bg-orange-400 text-orange-950 border-orange-500',
  },
};

export const LISTE_ETATS = Object.keys(ETATS) as EtatDent[];
