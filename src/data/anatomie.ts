import type { Dentition } from '@/types';
import { arcades, estDentTemporaire, estMaxillaire, position, typeDent } from '@/data/teeth';

/**
 * Dimensions coronaires moyennes, en millimètres : diamètre mésio-distal et
 * diamètre vestibulo-lingual. Valeurs usuelles d'anatomie dentaire ; elles
 * donnent à l'arcade ses proportions réelles — une 36 est plus large qu'une
 * 31, une incisive est plus plate qu'une molaire.
 */
export interface DimensionsDent {
  /** Diamètre mésio-distal (largeur le long de l'arcade). */
  md: number;
  /** Diamètre vestibulo-lingual (profondeur). */
  vl: number;
}

const PERM_MAXILLAIRE: Record<number, DimensionsDent> = {
  1: { md: 8.5, vl: 7.0 },
  2: { md: 6.5, vl: 6.0 },
  3: { md: 7.5, vl: 8.0 },
  4: { md: 7.0, vl: 9.0 },
  5: { md: 6.5, vl: 9.0 },
  6: { md: 10.0, vl: 11.0 },
  7: { md: 9.0, vl: 11.0 },
  8: { md: 8.5, vl: 10.0 },
};

const PERM_MANDIBULAIRE: Record<number, DimensionsDent> = {
  1: { md: 5.0, vl: 6.0 },
  2: { md: 5.5, vl: 6.5 },
  3: { md: 7.0, vl: 7.5 },
  4: { md: 7.0, vl: 7.5 },
  5: { md: 7.0, vl: 8.0 },
  6: { md: 11.0, vl: 10.5 },
  7: { md: 10.5, vl: 10.0 },
  8: { md: 10.0, vl: 9.5 },
};

const TEMP_MAXILLAIRE: Record<number, DimensionsDent> = {
  1: { md: 6.5, vl: 5.0 },
  2: { md: 5.1, vl: 4.0 },
  3: { md: 7.0, vl: 7.0 },
  4: { md: 7.3, vl: 8.5 },
  5: { md: 8.2, vl: 10.0 },
};

const TEMP_MANDIBULAIRE: Record<number, DimensionsDent> = {
  1: { md: 4.2, vl: 4.0 },
  2: { md: 4.1, vl: 4.0 },
  3: { md: 5.0, vl: 4.8 },
  4: { md: 7.7, vl: 7.0 },
  5: { md: 9.9, vl: 8.7 },
};

export function dimensions(numero: number): DimensionsDent {
  const p = position(numero);
  const table = estDentTemporaire(numero)
    ? estMaxillaire(numero)
      ? TEMP_MAXILLAIRE
      : TEMP_MANDIBULAIRE
    : estMaxillaire(numero)
      ? PERM_MAXILLAIRE
      : PERM_MANDIBULAIRE;
  return table[p] ?? { md: 7, vl: 8 };
}

/* ------------------------------------------------------------------ *
 * Disposition sur l'arcade
 * ------------------------------------------------------------------ */

/**
 * Rapport largeur/profondeur de l'arcade. L'arcade mandibulaire est plus
 * étroite et plus parabolique que l'arcade maxillaire, qui est plus ovoïde.
 */
const RATIO_MAXILLAIRE = 0.7;
const RATIO_MANDIBULAIRE = 0.6;
/** Espace interdentaire laissé entre deux couronnes, en mm. */
const JEU_INTERDENTAIRE = 0.6;

interface PointArc {
  x: number;
  y: number;
  /** Longueur d'arc cumulée depuis la ligne médiane. */
  s: number;
  /** Angle de la tangente, en degrés. */
  angle: number;
}

/**
 * Échantillonne un quart d'ellipse et tabule sa longueur d'arc, pour pouvoir
 * poser chaque dent à sa distance réelle de la ligne médiane plutôt qu'à un
 * angle arbitraire. C'est ce qui donne un espacement anatomique correct.
 */
function tabulerQuart(rx: number, ry: number, pas = 600): PointArc[] {
  const points: PointArc[] = [];
  let s = 0;
  let xPrec = 0;
  let yPrec = -ry;
  for (let i = 0; i <= pas; i += 1) {
    const t = (i / pas) * (Math.PI / 2);
    const x = rx * Math.sin(t);
    const y = -ry * Math.cos(t);
    if (i > 0) s += Math.hypot(x - xPrec, y - yPrec);
    // Tangente de l'ellipse : (rx cos t, ry sin t)
    const angle = (Math.atan2(ry * Math.sin(t), rx * Math.cos(t)) * 180) / Math.PI;
    points.push({ x, y, s, angle });
    xPrec = x;
    yPrec = y;
  }
  return points;
}

function interpoler(table: PointArc[], s: number): PointArc {
  const total = table[table.length - 1].s;
  if (s <= 0) return table[0];
  if (s >= total) {
    // Au-delà du quart d'ellipse, on prolonge en ligne droite vers l'arrière.
    const fin = table[table.length - 1];
    const extra = s - total;
    const rad = (fin.angle * Math.PI) / 180;
    return { x: fin.x + Math.cos(rad) * extra, y: fin.y + Math.sin(rad) * extra, s, angle: fin.angle };
  }
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].s < s) lo = mid;
    else hi = mid;
  }
  const a = table[lo];
  const b = table[hi];
  const k = (s - a.s) / (b.s - a.s || 1);
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    s,
    angle: a.angle + (b.angle - a.angle) * k,
  };
}

export interface PlacementDent {
  numero: number;
  /** Centre de la couronne, en millimètres, origine à la ligne médiane. */
  x: number;
  y: number;
  /** Rotation de la couronne pour suivre la courbure de l'arcade, en degrés. */
  rotation: number;
  dimensions: DimensionsDent;
  /** Vrai pour les quadrants situés à droite du patient (gauche de l'écran). */
  droite: boolean;
}

/**
 * Pose une demi-arcade : chaque dent occupe sa largeur réelle le long de la
 * courbe, et pivote avec la tangente. L'ellipse est mise à l'échelle pour que
 * son quart de périmètre corresponde exactement à la somme des largeurs.
 */
export function placerArcade(numeros: number[], maxillaire: boolean): PlacementDent[] {
  const moitie = numeros.length / 2;
  // numeros va de la dent la plus postérieure droite à la plus postérieure gauche.
  const demiDroite = numeros.slice(0, moitie).reverse(); // de la ligne médiane vers l'arrière
  const demiGauche = numeros.slice(moitie);

  const longueurDemi = demiDroite.reduce(
    (t, n) => t + dimensions(n).md + JEU_INTERDENTAIRE,
    -JEU_INTERDENTAIRE / 2,
  );

  // Ellipse de référence, mise à l'échelle sur la longueur d'arc nécessaire.
  const ryBase = 100;
  const rxBase = ryBase * (maxillaire ? RATIO_MAXILLAIRE : RATIO_MANDIBULAIRE);
  const essai = tabulerQuart(rxBase, ryBase);
  const quart = essai[essai.length - 1].s;
  const echelle = Math.min(1, longueurDemi / quart) || 1;
  const table = tabulerQuart(rxBase * echelle, ryBase * echelle);

  const poser = (liste: number[], signe: 1 | -1): PlacementDent[] => {
    let s = 0;
    return liste.map((numero) => {
      const d = dimensions(numero);
      s += d.md / 2;
      const p = interpoler(table, s);
      s += d.md / 2 + JEU_INTERDENTAIRE;
      return {
        numero,
        x: signe * p.x,
        // L'arcade mandibulaire est le miroir vertical de l'arcade maxillaire.
        y: maxillaire ? p.y : -p.y,
        rotation: maxillaire ? signe * p.angle : -signe * p.angle,
        dimensions: d,
        droite: signe === -1,
      };
    });
  };

  return [...poser(demiDroite, -1).reverse(), ...poser(demiGauche, 1)];
}

export interface DispositionArcades {
  haut: PlacementDent[];
  bas: PlacementDent[];
  /** Boîte englobante en millimètres, marge comprise. */
  boite: { x: number; y: number; largeur: number; hauteur: number };
}

/** Écart vertical entre les deux arcades, en millimètres. */
const ECART_ARCADES = 16;

export function disposerArcades(dentition: Dentition): DispositionArcades {
  const { haut, bas } = arcades(dentition);
  const placementHaut = placerArcade(haut, true).map((p) => ({ ...p, y: p.y - ECART_ARCADES / 2 }));
  const placementBas = placerArcade(bas, false).map((p) => ({ ...p, y: p.y + ECART_ARCADES / 2 }));

  const tous = [...placementHaut, ...placementBas];
  const marge = 14;
  const demiDiag = (p: PlacementDent) => Math.hypot(p.dimensions.md, p.dimensions.vl) / 2;
  const minX = Math.min(...tous.map((p) => p.x - demiDiag(p))) - marge;
  const maxX = Math.max(...tous.map((p) => p.x + demiDiag(p))) + marge;
  const minY = Math.min(...tous.map((p) => p.y - demiDiag(p))) - marge;
  const maxY = Math.max(...tous.map((p) => p.y + demiDiag(p))) + marge;

  return {
    haut: placementHaut,
    bas: placementBas,
    boite: { x: minX, y: minY, largeur: maxX - minX, hauteur: maxY - minY },
  };
}

/* ------------------------------------------------------------------ *
 * Silhouettes coronaires (vue occlusale)
 * ------------------------------------------------------------------ */

/**
 * Contour de la couronne vue par la face occlusale, dans le repère local de
 * la dent : X = mésio-distal, Y = vestibulo-lingual (Y négatif = vestibulaire).
 */
export function contourCouronne(numero: number, d: DimensionsDent): string {
  const w = d.md / 2;
  const h = d.vl / 2;
  const t = typeDent(numero);

  if (t === 'incisive') {
    // Couronne aplatie, bord incisif rectiligne côté vestibulaire.
    const r = Math.min(w, h) * 0.35;
    return [
      `M ${-w + r} ${-h}`,
      `L ${w - r} ${-h}`,
      `Q ${w} ${-h} ${w} ${-h + r}`,
      `L ${w * 0.85} ${h - r}`,
      `Q ${w * 0.8} ${h} ${w * 0.6} ${h}`,
      `L ${-w * 0.6} ${h}`,
      `Q ${-w * 0.8} ${h} ${-w * 0.85} ${h - r}`,
      `L ${-w} ${-h + r}`,
      `Q ${-w} ${-h} ${-w + r} ${-h}`,
      'Z',
    ].join(' ');
  }

  if (t === 'canine') {
    // Pointe cuspidienne marquée côté vestibulaire.
    return [
      `M 0 ${-h}`,
      `Q ${w * 0.75} ${-h * 0.75} ${w} ${-h * 0.1}`,
      `Q ${w} ${h * 0.7} ${w * 0.45} ${h}`,
      `L ${-w * 0.45} ${h}`,
      `Q ${-w} ${h * 0.7} ${-w} ${-h * 0.1}`,
      `Q ${-w * 0.75} ${-h * 0.75} 0 ${-h}`,
      'Z',
    ].join(' ');
  }

  if (t === 'premolaire') {
    // Ovale à deux cuspides, légèrement plus étroit en lingual.
    return [
      `M ${-w * 0.85} ${-h * 0.6}`,
      `Q ${-w * 0.9} ${-h} ${-w * 0.25} ${-h}`,
      `L ${w * 0.25} ${-h}`,
      `Q ${w * 0.9} ${-h} ${w * 0.85} ${-h * 0.6}`,
      `L ${w * 0.8} ${h * 0.5}`,
      `Q ${w * 0.75} ${h} ${w * 0.2} ${h}`,
      `L ${-w * 0.2} ${h}`,
      `Q ${-w * 0.75} ${h} ${-w * 0.8} ${h * 0.5}`,
      'Z',
    ].join(' ');
  }

  // Molaire : table occlusale quadrangulaire aux angles arrondis.
  const r = Math.min(w, h) * 0.3;
  return [
    `M ${-w + r} ${-h}`,
    `L ${w - r} ${-h}`,
    `Q ${w} ${-h} ${w} ${-h + r}`,
    `L ${w} ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `L ${-w + r} ${h}`,
    `Q ${-w} ${h} ${-w} ${h - r}`,
    `L ${-w} ${-h + r}`,
    `Q ${-w} ${-h} ${-w + r} ${-h}`,
    'Z',
  ].join(' ');
}

/** Sillons occlusaux dessinés par-dessus la couronne, purement illustratifs. */
export function sillons(numero: number, d: DimensionsDent): string[] {
  const w = d.md / 2;
  const h = d.vl / 2;
  const t = typeDent(numero);

  if (t === 'incisive') return [`M ${-w * 0.7} ${-h * 0.55} L ${w * 0.7} ${-h * 0.55}`];
  if (t === 'canine') return [`M 0 ${-h * 0.7} L 0 ${h * 0.3}`];
  if (t === 'premolaire') return [`M ${-w * 0.5} 0 L ${w * 0.5} 0`];

  const molaire3 = position(numero) === 8;
  const traits = [`M ${-w * 0.62} 0 L ${w * 0.62} 0`];
  if (!molaire3) {
    traits.push(`M ${-w * 0.2} ${-h * 0.62} L ${-w * 0.2} ${h * 0.62}`);
    traits.push(`M ${w * 0.3} ${-h * 0.62} L ${w * 0.3} ${h * 0.5}`);
  } else {
    traits.push(`M 0 ${-h * 0.5} L 0 ${h * 0.5}`);
  }
  return traits;
}
