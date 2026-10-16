/**
 * Lecture des fichiers DICOM produits par les capteurs dentaires.
 *
 * Portée volontairement étroite : les syntaxes de transfert **non
 * compressées**, qui couvrent la sortie courante des capteurs
 * rétro-alvéolaires et des panoramiques. Tout le reste est refusé avec un
 * message nommant la syntaxe rencontrée, plutôt qu'accepté puis affiché en
 * bouillie. Un outil clinique qui affiche une image fausse est pire qu'un
 * outil qui refuse.
 *
 * Le fichier est converti en PNG à l'import : la galerie, les vignettes, le
 * chiffrement du coffre, la visionneuse et les annotations fonctionnent
 * ensuite sans rien savoir du DICOM. L'original est conservé à côté, pour
 * pouvoir être réexporté vers un confrère.
 */

/** Syntaxes dont les pixels sont stockés tels quels. */
const SYNTAXES_LUES: Record<string, string> = {
  '1.2.840.10008.1.2': 'VR implicite, petit-boutiste',
  '1.2.840.10008.1.2.1': 'VR explicite, petit-boutiste',
};

/** Syntaxes connues mais compressées, nommées pour que le refus soit utile. */
const SYNTAXES_COMPRESSEES: Record<string, string> = {
  '1.2.840.10008.1.2.2': 'VR explicite, gros-boutiste',
  '1.2.840.10008.1.2.5': 'RLE',
  '1.2.840.10008.1.2.4.50': 'JPEG de base',
  '1.2.840.10008.1.2.4.51': 'JPEG étendu',
  '1.2.840.10008.1.2.4.57': 'JPEG sans perte',
  '1.2.840.10008.1.2.4.70': 'JPEG sans perte, premier ordre',
  '1.2.840.10008.1.2.4.80': 'JPEG-LS sans perte',
  '1.2.840.10008.1.2.4.81': 'JPEG-LS avec perte',
  '1.2.840.10008.1.2.4.90': 'JPEG 2000 sans perte',
  '1.2.840.10008.1.2.4.91': 'JPEG 2000',
};

export interface MetaDicom {
  largeur: number;
  hauteur: number;
  bitsAlloues: number;
  signe: boolean;
  echantillonsParPixel: number;
  /** MONOCHROME1 affiche le blanc en bas d'échelle : l'image est inversée. */
  monochromeInverse: boolean;
  centre: number | null;
  fenetre: number | null;
  pente: number;
  ordonnee: number;
  syntaxe: string;
  modalite: string;
  dateExamen: string;
  nombreDeVues: number;
}

export class DicomIllisible extends Error {}

/**
 * Reconnaît un fichier DICOM.
 *
 * Le préambule de 128 octets suivi de « DICM » est la marque du format.
 * Certains exports omettent le préambule : on accepte alors l'extension,
 * la lecture dira ensuite si le contenu tient debout.
 */
export function estDicom(octets: Uint8Array, nom = ''): boolean {
  if (octets.length > 132) {
    const marque = String.fromCharCode(octets[128], octets[129], octets[130], octets[131]);
    if (marque === 'DICM') return true;
  }
  return /\.dcm$/i.test(nom.trim());
}

/* Un en-tête DICOM se lit avec une bibliothèque, pas à la main. */
type JeuDeDonnees = {
  uint16(tag: string): number | undefined;
  intString(tag: string): number | undefined;
  floatString(tag: string, index?: number): number | undefined;
  string(tag: string): string | undefined;
  elements: Record<string, { dataOffset: number; length: number } | undefined>;
  byteArray: Uint8Array;
};

export function lireEnTete(jeu: JeuDeDonnees): MetaDicom {
  const syntaxe = (jeu.string('x00020010') ?? '1.2.840.10008.1.2').trim();

  if (!SYNTAXES_LUES[syntaxe]) {
    const nom = SYNTAXES_COMPRESSEES[syntaxe];
    throw new DicomIllisible(
      nom
        ? `Ce DICOM est compressé en ${nom}. Cette version ne lit que les DICOM non compressés ; exportez le cliché en TIFF, PNG ou JPEG depuis votre logiciel de capteur.`
        : `Syntaxe de transfert non reconnue (${syntaxe}). Cette version ne lit que les DICOM non compressés.`,
    );
  }

  const hauteur = jeu.uint16('x00280010') ?? 0;
  const largeur = jeu.uint16('x00280011') ?? 0;
  if (largeur <= 0 || hauteur <= 0) {
    throw new DicomIllisible('Ce DICOM ne déclare pas de dimensions d’image exploitables.');
  }

  const echantillonsParPixel = jeu.uint16('x00280002') ?? 1;
  if (echantillonsParPixel !== 1 && echantillonsParPixel !== 3) {
    throw new DicomIllisible(
      `Ce DICOM porte ${echantillonsParPixel} échantillons par pixel, ce que cette version ne sait pas afficher.`,
    );
  }

  const photometrie = (jeu.string('x00280004') ?? 'MONOCHROME2').trim().toUpperCase();

  return {
    largeur,
    hauteur,
    bitsAlloues: jeu.uint16('x00280100') ?? 16,
    signe: (jeu.uint16('x00280103') ?? 0) === 1,
    echantillonsParPixel,
    monochromeInverse: photometrie === 'MONOCHROME1',
    centre: jeu.floatString('x00281050', 0) ?? null,
    fenetre: jeu.floatString('x00281051', 0) ?? null,
    pente: jeu.floatString('x00281053', 0) ?? 1,
    ordonnee: jeu.floatString('x00281052', 0) ?? 0,
    syntaxe,
    modalite: (jeu.string('x00080060') ?? '').trim(),
    dateExamen: (jeu.string('x00080020') ?? '').trim(),
    nombreDeVues: jeu.intString('x00280008') ?? 1,
  };
}

/** Pixels bruts de la première vue, dans leur type d'origine. */
export function lirePixels(jeu: JeuDeDonnees, meta: MetaDicom): Int32Array {
  const element = jeu.elements.x7fe00010;
  if (!element) throw new DicomIllisible('Ce DICOM ne contient pas de données d’image.');

  const parVue = meta.largeur * meta.hauteur * meta.echantillonsParPixel;
  const base = jeu.byteArray.byteOffset + element.dataOffset;
  const sortie = new Int32Array(parVue);

  if (meta.bitsAlloues === 8) {
    const vue = new Uint8Array(jeu.byteArray.buffer, base, Math.min(parVue, element.length));
    for (let i = 0; i < sortie.length && i < vue.length; i++) {
      sortie[i] = meta.signe ? (vue[i] << 24) >> 24 : vue[i];
    }
    return sortie;
  }

  if (meta.bitsAlloues === 16) {
    const disponibles = Math.min(parVue, Math.floor(element.length / 2));
    /*
     * Une vue 16 bits exige un décalage pair. La norme aligne les éléments,
     * mais un fichier malformé ferait lever le constructeur : on recopie
     * alors les octets dans un tampon propre plutôt que de planter.
     */
    const aligne = base % 2 === 0;
    const tampon = aligne
      ? jeu.byteArray.buffer
      : jeu.byteArray.slice(element.dataOffset, element.dataOffset + disponibles * 2).buffer;
    const decalage = aligne ? base : 0;
    const vue = meta.signe
      ? new Int16Array(tampon, decalage, disponibles)
      : new Uint16Array(tampon, decalage, disponibles);
    for (let i = 0; i < disponibles; i++) sortie[i] = vue[i];
    return sortie;
  }

  throw new DicomIllisible(
    `Ce DICOM code ses pixels sur ${meta.bitsAlloues} bits, ce que cette version ne sait pas lire.`,
  );
}

/**
 * Fenêtrage : ramène les valeurs à 8 bits affichables.
 *
 * Un capteur code souvent sur 12 ou 16 bits. Sans fenêtrage, tout écraser
 * sur 256 niveaux donnerait une image plate et sans diagnostic. La formule
 * est celle de la norme (VOI LUT linéaire). Faute de fenêtre déclarée, on la
 * déduit de l'étendue réelle des valeurs.
 */
export function appliquerFenetre(pixels: Int32Array, meta: MetaDicom): Uint8ClampedArray {
  let centre = meta.centre;
  let fenetre = meta.fenetre;

  if (centre === null || fenetre === null || fenetre <= 0) {
    let bas = Infinity;
    let haut = -Infinity;
    for (const brut of pixels) {
      const v = brut * meta.pente + meta.ordonnee;
      if (v < bas) bas = v;
      if (v > haut) haut = v;
    }
    if (!Number.isFinite(bas) || !Number.isFinite(haut) || haut === bas) {
      bas = 0;
      haut = 255;
    }
    fenetre = haut - bas;
    centre = bas + fenetre / 2;
  }

  const demi = (fenetre - 1) / 2;
  const seuilBas = centre - 0.5 - demi;
  const sortie = new Uint8ClampedArray(pixels.length);

  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i] * meta.pente + meta.ordonnee;
    let gris: number;
    if (v <= seuilBas) gris = 0;
    else if (v > centre - 0.5 + demi) gris = 255;
    else gris = ((v - (centre - 0.5)) / (fenetre - 1) + 0.5) * 255;
    sortie[i] = meta.monochromeInverse ? 255 - gris : gris;
  }

  return sortie;
}

/** Données RVBA prêtes pour un canevas. */
export function composerImage(valeurs: Uint8ClampedArray, meta: MetaDicom): Uint8ClampedArray {
  const pixels = meta.largeur * meta.hauteur;
  const rvba = new Uint8ClampedArray(pixels * 4);

  if (meta.echantillonsParPixel === 3) {
    for (let i = 0; i < pixels; i++) {
      rvba[i * 4] = valeurs[i * 3];
      rvba[i * 4 + 1] = valeurs[i * 3 + 1];
      rvba[i * 4 + 2] = valeurs[i * 3 + 2];
      rvba[i * 4 + 3] = 255;
    }
    return rvba;
  }

  for (let i = 0; i < pixels; i++) {
    const gris = valeurs[i];
    rvba[i * 4] = gris;
    rvba[i * 4 + 1] = gris;
    rvba[i * 4 + 2] = gris;
    rvba[i * 4 + 3] = 255;
  }
  return rvba;
}

export interface ClicheDicom {
  png: Blob;
  meta: MetaDicom;
}

/**
 * Convertit un DICOM en PNG.
 *
 * Le décodeur est importé à la demande : un cabinet qui n'ouvre jamais de
 * DICOM ne télécharge pas la bibliothèque.
 */
export async function dicomVersPng(fichier: Blob): Promise<ClicheDicom> {
  const octets = new Uint8Array(await fichier.arrayBuffer());
  const { default: analyseur } = await import('dicom-parser');

  let jeu: JeuDeDonnees;
  try {
    jeu = analyseur.parseDicom(octets) as unknown as JeuDeDonnees;
  } catch (e) {
    throw new DicomIllisible(
      `Ce fichier ne se lit pas comme un DICOM (${e instanceof Error ? e.message : 'erreur inconnue'}).`,
    );
  }

  const meta = lireEnTete(jeu);
  const valeurs =
    meta.echantillonsParPixel === 3
      ? Uint8ClampedArray.from(lirePixels(jeu, meta))
      : appliquerFenetre(lirePixels(jeu, meta), meta);

  const canevas = document.createElement('canvas');
  canevas.width = meta.largeur;
  canevas.height = meta.hauteur;
  const ctx = canevas.getContext('2d');
  if (!ctx) throw new DicomIllisible('Le navigateur n’a pas fourni de contexte de dessin.');
  // createImageData plutôt que le constructeur ImageData : le tampon est
  // fourni par le contexte, ce qui évite toute question de type de buffer.
  const image = ctx.createImageData(meta.largeur, meta.hauteur);
  image.data.set(composerImage(valeurs, meta));
  ctx.putImageData(image, 0, 0);

  const png = await new Promise<Blob | null>((resolve) => canevas.toBlob(resolve, 'image/png'));
  if (!png) throw new DicomIllisible('La conversion du DICOM en image a échoué.');

  return { png, meta };
}

/** « 20260412 » devient « 12/04/2026 ». */
export function formaterDateDicom(brut: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(brut.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Libellé d'un cliché importé depuis un DICOM. */
export function libelleDicom(nomFichier: string, meta: MetaDicom): string {
  const base = nomFichier.replace(/\.[^.]+$/, '').trim();
  const parts = [base || 'Cliché DICOM'];
  if (meta.modalite) parts.push(meta.modalite);
  const date = formaterDateDicom(meta.dateExamen);
  if (date) parts.push(date);
  return parts.join(' · ');
}
