import type { ChartingParo, DentPerio, MesureSite, SitePerio } from '@/types';
import { estDentTemporaire, position, typeDent } from '@/data/teeth';

/** Ordre de sondage : vestibulaire de mésial vers distal, puis lingual/palatin. */
export const SITES_PERIO: SitePerio[] = ['MV', 'V', 'DV', 'ML', 'L', 'DL'];

export const SITES_VESTIBULAIRES: SitePerio[] = ['MV', 'V', 'DV'];
export const SITES_LINGUAUX: SitePerio[] = ['ML', 'L', 'DL'];

/** Sites interdentaires : ce sont eux qui déterminent le stade. */
export const SITES_INTERDENTAIRES: SitePerio[] = ['MV', 'DV', 'ML', 'DL'];

export const LIBELLE_SITE: Record<SitePerio, string> = {
  MV: 'Mésio-vestibulaire',
  V: 'Vestibulaire',
  DV: 'Disto-vestibulaire',
  ML: 'Mésio-lingual',
  L: 'Lingual / palatin',
  DL: 'Disto-lingual',
};

/** Les molaires (et la 1re prémolaire maxillaire) ont une furcation sondable. */
export function estPluriradiculee(numero: number): boolean {
  if (estDentTemporaire(numero)) return position(numero) >= 4;
  return typeDent(numero) === 'molaire';
}

export function siteVide(): MesureSite {
  return { pd: null, rec: null, bop: false, plaque: false, pus: false };
}

export function dentPerioVide(numero: number): DentPerio {
  return {
    numero,
    sites: {
      MV: siteVide(),
      V: siteVide(),
      DV: siteVide(),
      ML: siteVide(),
      L: siteVide(),
      DL: siteVide(),
    },
    mobilite: 0,
    furcation: 0,
  };
}

/** Niveau d'attache clinique brut : profondeur de poche + position de la marge gingivale. */
export function cal(site: MesureSite): number | null {
  if (site.pd === null) return null;
  return site.pd + (site.rec ?? 0);
}

/** Profondeur du sulcus physiologique : au-delà, il y a poche véritable. */
export const SULCUS_PHYSIOLOGIQUE = 3;

/**
 * Perte d'attache retenue pour la stadification.
 *
 * Le CAL brut (PD + marge) compte le sulcus physiologique comme une perte :
 * un parodonte sain sondé à 2 mm, marge à la jonction émail-cément, afficherait
 * 2 mm de « perte » et serait classé à tort en parodontite de stade I. On ne
 * retient donc une perte que lorsqu'il y a une preuve d'atteinte :
 *   — marge gingivale apicale à la JEC (récession > 0) : perte = PD + récession ;
 *   — sinon, poche vraie au-delà du sulcus physiologique : perte = PD − 3.
 * La règle appliquée est restituée au praticien, qui garde la main sur le stade.
 */
export function perteAttache(site: MesureSite): number | null {
  if (site.pd === null) return null;
  const rec = site.rec ?? 0;
  if (rec > 0) return site.pd + rec;
  return Math.max(0, site.pd + rec - SULCUS_PHYSIOLOGIQUE);
}

/**
 * Deux dents sont adjacentes si elles se suivent dans le même quadrant, ou si
 * elles encadrent la ligne médiane (11/21, 31/41). La définition de cas 2018
 * exige une perte d'attache sur au moins deux dents NON adjacentes.
 */
export function sontAdjacentes(a: number, b: number): boolean {
  if (a === b) return true;
  const qa = Math.floor(a / 10);
  const qb = Math.floor(b / 10);
  const pa = a % 10;
  const pb = b % 10;
  if (qa === qb) return Math.abs(pa - pb) === 1;
  const memeArcade =
    (qa === 1 && qb === 2) || (qa === 2 && qb === 1) || (qa === 3 && qb === 4) || (qa === 4 && qb === 3);
  return memeArcade && pa === 1 && pb === 1;
}

/** Vrai s'il existe deux dents non adjacentes dans la liste. */
export function auMoinsDeuxNonAdjacentes(numeros: number[]): boolean {
  for (let i = 0; i < numeros.length; i += 1) {
    for (let j = i + 1; j < numeros.length; j += 1) {
      if (!sontAdjacentes(numeros[i], numeros[j])) return true;
    }
  }
  return false;
}

export interface IndicesParo {
  /** Nombre de sites effectivement sondés. */
  sitesSondes: number;
  /** Indice de saignement au sondage, en %. */
  bopPct: number;
  /** Indice de plaque, en %. */
  plaquePct: number;
  /** Poches ≥ 4 mm, en % des sites sondés. */
  poches4Pct: number;
  /** Poches ≥ 6 mm, en % des sites sondés. */
  poches6Pct: number;
  pdMax: number;
  /** CAL brut maximal (PD + marge gingivale), pour le compte rendu clinique. */
  calMax: number;
  /** Perte d'attache interdentaire maximale : la mesure qui fixe le stade. */
  calInterdentaireMax: number;
  /** Dents présentant une perte d'attache interdentaire ≥ 1 mm. */
  dentsAvecPerte: number[];
  dentsSondees: number;
  dentsAtteintes: number;
  /** Proportion de dents portant au moins un site à CAL ≥ 1 mm. */
  etenduePct: number;
  suppurationSites: number;
  furcationsAtteintes: number;
  mobilitesAtteintes: number;
}

/**
 * Agrège les mesures. Les dents absentes de la bouche sont exclues : elles ne
 * doivent peser ni sur les indices ni sur la stadification.
 */
export function calculerIndices(charting: ChartingParo, absentes: number[] = []): IndicesParo {
  let sitesSondes = 0;
  let bop = 0;
  let plaque = 0;
  let p4 = 0;
  let p6 = 0;
  let pdMax = 0;
  let calMax = 0;
  let calInter = 0;
  let pus = 0;
  let dentsSondees = 0;
  let dentsAtteintes = 0;
  let furcations = 0;
  let mobilites = 0;

  const dentsAvecPerte: number[] = [];

  const dentsPresentes = charting.dents.filter((d) => !absentes.includes(d.numero));

  for (const dent of dentsPresentes) {
    let dentSondee = false;
    let dentAtteinte = false;
    let perteInterdentaire = false;
    for (const site of SITES_PERIO) {
      const m = dent.sites[site];
      if (m.plaque) plaque += 1;
      if (m.pd === null) continue;
      sitesSondes += 1;
      dentSondee = true;
      if (m.bop) bop += 1;
      if (m.pus) pus += 1;
      if (m.pd >= 4) p4 += 1;
      if (m.pd >= 6) p6 += 1;
      pdMax = Math.max(pdMax, m.pd);
      calMax = Math.max(calMax, cal(m) ?? 0);
      const perte = perteAttache(m) ?? 0;
      if (perte >= 1) dentAtteinte = true;
      if (SITES_INTERDENTAIRES.includes(site)) {
        calInter = Math.max(calInter, perte);
        if (perte >= 1) perteInterdentaire = true;
      }
    }
    if (dentSondee) dentsSondees += 1;
    if (dentAtteinte) dentsAtteintes += 1;
    if (perteInterdentaire) dentsAvecPerte.push(dent.numero);
    if (dent.furcation > 0) furcations += 1;
    if (dent.mobilite > 0) mobilites += 1;
  }

  const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);

  return {
    sitesSondes,
    bopPct: pct(bop, sitesSondes),
    plaquePct: pct(plaque, dentsPresentes.length * SITES_PERIO.length),
    poches4Pct: pct(p4, sitesSondes),
    poches6Pct: pct(p6, sitesSondes),
    pdMax,
    calMax,
    calInterdentaireMax: calInter,
    dentsAvecPerte,
    dentsSondees,
    dentsAtteintes,
    etenduePct: pct(dentsAtteintes, dentsSondees),
    suppurationSites: pus,
    furcationsAtteintes: furcations,
    mobilitesAtteintes: mobilites,
  };
}

export type StadeParo = 'I' | 'II' | 'III' | 'IV';
export type GradeParo = 'A' | 'B' | 'C';
export type EtendueParo = 'localisee' | 'generalisee' | 'incisivo_molaire';

export interface DiagnosticParo {
  /** Vrai si les critères de parodontite ne sont pas réunis. */
  gingiviteSeule: boolean;
  stade: StadeParo | null;
  grade: GradeParo | null;
  etendue: EtendueParo | null;
  /** Phrase de diagnostic prête à coller dans le dossier. */
  libelle: string;
  /** Chaque critère retenu, pour que le praticien puisse vérifier le raisonnement. */
  justifications: string[];
  indices: IndicesParo;
  /** Stabilité du traitement selon les critères EFP 2018. */
  stabilite: 'stable' | 'remission' | 'instable' | 'non_evaluable';
}

/**
 * Classification des maladies parodontales de 2018 (AAP/EFP), appliquée de
 * manière déterministe et entièrement traçable : chaque critère retenu est
 * restitué au praticien, qui reste seul juge du diagnostic final.
 */
export function diagnostiquer(
  charting: ChartingParo,
  ageAnnees: number,
  absentes: number[] = [],
): DiagnosticParo {
  const indices = calculerIndices(charting, absentes);
  const dentsAbsentes = absentes.length;
  const justifications: string[] = [];

  if (indices.sitesSondes === 0) {
    return {
      gingiviteSeule: false,
      stade: null,
      grade: null,
      etendue: null,
      libelle: 'Sondage incomplet — diagnostic non calculable',
      justifications: ['Aucun site sondé.'],
      indices,
      stabilite: 'non_evaluable',
    };
  }

  // Définition de cas 2018 : perte d'attache interdentaire détectable sur au
  // moins deux dents NON adjacentes.
  const nonAdjacentes = auMoinsDeuxNonAdjacentes(indices.dentsAvecPerte);
  const parodontite = indices.calInterdentaireMax >= 1 && nonAdjacentes;

  if (!parodontite) {
    const gingivite = indices.bopPct >= 10;
    justifications.push(
      indices.dentsAvecPerte.length > 0 && !nonAdjacentes
        ? `Perte d'attache interdentaire limitée à des dents adjacentes (${indices.dentsAvecPerte.join(', ')}) : définition de cas de parodontite non remplie.`
        : `Perte d'attache interdentaire maximale ${indices.calInterdentaireMax} mm sur ${indices.dentsAvecPerte.length} dent(s) : critères de parodontite non réunis.`,
      `Saignement au sondage ${indices.bopPct} %.`,
    );
    return {
      gingiviteSeule: true,
      stade: null,
      grade: null,
      etendue: null,
      libelle: gingivite
        ? indices.bopPct >= 30
          ? 'Gingivite généralisée'
          : 'Gingivite localisée'
        : 'Parodonte sain ou réduit et stable',
      justifications,
      indices,
      stabilite: indices.bopPct < 10 ? 'stable' : 'instable',
    };
  }

  // Stade : sévérité par le CAL interdentaire, puis complexité.
  let stade: StadeParo;
  if (indices.calInterdentaireMax <= 2) stade = 'I';
  else if (indices.calInterdentaireMax <= 4) stade = 'II';
  else stade = 'III';
  justifications.push(
    `Perte d'attache interdentaire maximale ${indices.calInterdentaireMax} mm, sur ${indices.dentsAvecPerte.length} dent(s) dont au moins deux non adjacentes → stade ${stade} (sévérité).`,
  );

  if (stade === 'III' || stade === 'II') {
    if (indices.pdMax >= 6) {
      if (stade !== 'III') justifications.push(`Poche maximale ${indices.pdMax} mm ≥ 6 mm → complexité de stade III.`);
      stade = 'III';
    }
    if (indices.furcationsAtteintes > 0) {
      if (stade !== 'III') justifications.push('Atteinte de furcation → complexité de stade III.');
      stade = 'III';
    }
  }
  if (dentsAbsentes >= 5 || indices.mobilitesAtteintes >= 3) {
    stade = 'IV';
    justifications.push(
      dentsAbsentes >= 5
        ? `${dentsAbsentes} dents absentes → stade IV (réhabilitation complexe).`
        : `${indices.mobilitesAtteintes} dents mobiles → stade IV.`,
    );
  }

  // Grade : vitesse de progression, estimée par perte osseuse rapportée à l'âge.
  let grade: GradeParo = 'B';
  const po = charting.perteOsseusePct;
  if (po !== null && ageAnnees > 0) {
    const ratio = po / ageAnnees;
    if (ratio < 0.25) grade = 'A';
    else if (ratio <= 1) grade = 'B';
    else grade = 'C';
    justifications.push(
      `Perte osseuse ${po} % pour ${ageAnnees} ans → ratio ${ratio.toFixed(2)} → grade ${grade} (progression).`,
    );
  } else {
    justifications.push('Perte osseuse radiographique non renseignée → grade B retenu par défaut.');
  }

  // Modificateurs de grade : tabac et diabète ne peuvent que l'aggraver.
  if (charting.fumeur === 'dix_ou_plus') {
    grade = 'C';
    justifications.push('Tabagisme ≥ 10 cigarettes/jour → grade C.');
  } else if (charting.fumeur === 'moins_10' && grade === 'A') {
    grade = 'B';
    justifications.push('Tabagisme < 10 cigarettes/jour → grade relevé à B.');
  }
  if (charting.diabete === 'desequilibre') {
    grade = 'C';
    justifications.push('Diabète déséquilibré (HbA1c ≥ 7 %) → grade C.');
  } else if (charting.diabete === 'equilibre' && grade === 'A') {
    grade = 'B';
    justifications.push('Diabète équilibré → grade relevé à B.');
  }

  // Étendue
  let etendue: EtendueParo = indices.etenduePct >= 30 ? 'generalisee' : 'localisee';
  const atteintes = indices.dentsAvecPerte;
  const estMI = (n: number) => position(n) <= 2 || position(n) >= 6;
  const atteinteMI = atteintes.filter(estMI).length;
  const auMoinsUneIncisive = atteintes.some((n) => position(n) <= 2);
  const auMoinsUneMolaire = atteintes.some((n) => position(n) >= 6);
  const atteinteTotale = atteintes.length;
  if (
    atteinteTotale >= 4 &&
    atteinteMI / atteinteTotale >= 0.9 &&
    auMoinsUneIncisive &&
    auMoinsUneMolaire
  ) {
    etendue = 'incisivo_molaire';
    justifications.push('Atteinte limitée aux incisives et aux molaires → forme incisivo-molaire.');
  } else {
    justifications.push(
      `${indices.etenduePct} % des dents atteintes → forme ${etendue === 'generalisee' ? 'généralisée' : 'localisée'}.`,
    );
  }

  // Stabilité après traitement (EFP 2018).
  let stabilite: DiagnosticParo['stabilite'];
  if (indices.pdMax <= 4 && indices.bopPct < 10 && indices.poches4Pct === 0) stabilite = 'stable';
  else if (indices.bopPct < 10 && indices.pdMax <= 4) stabilite = 'remission';
  else stabilite = 'instable';

  const etendueLibelle =
    etendue === 'generalisee' ? 'généralisée' : etendue === 'localisee' ? 'localisée' : 'incisivo-molaire';

  return {
    gingiviteSeule: false,
    stade,
    grade,
    etendue,
    libelle: `Parodontite ${etendueLibelle} de stade ${stade}, grade ${grade}`,
    justifications,
    indices,
    stabilite,
  };
}

/** Vrai si la dent présente au moins un site avec perte d'attache. */
export function dentAtteinte(d: DentPerio): boolean {
  return SITES_PERIO.some((s) => {
    const p = perteAttache(d.sites[s]);
    return p !== null && p >= 1;
  });
}

/** Couleur d'une profondeur de poche, du vert au rouge sombre. */
export function couleurPoche(pd: number | null): string {
  if (pd === null) return '#e2e8f0';
  if (pd <= 3) return '#86efac';
  if (pd === 4) return '#fde047';
  if (pd === 5) return '#fb923c';
  if (pd <= 7) return '#ef4444';
  return '#991b1b';
}
