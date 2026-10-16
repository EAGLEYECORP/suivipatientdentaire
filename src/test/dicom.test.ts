import { describe, expect, it } from 'vitest';
import {
  DicomIllisible,
  appliquerFenetre,
  composerImage,
  estDicom,
  formaterDateDicom,
  libelleDicom,
  lireEnTete,
  lirePixels,
  type MetaDicom,
} from '@/lib/dicom';

/* ------------------------------------------------------------------ *
 * Fabrique de jeux de données, pour éprouver notre lecture d'en-tête
 * sans dépendre de l'analyseur.
 * ------------------------------------------------------------------ */

type Tags = Record<string, number | string>;

function jeu(tags: Tags, pixels?: Int32Array, bitsAlloues = 16, signe = false) {
  let byteArray = new Uint8Array(0);
  let element: { dataOffset: number; length: number } | undefined;

  if (pixels) {
    const vue =
      bitsAlloues === 8
        ? signe
          ? Int8Array.from(pixels)
          : Uint8Array.from(pixels)
        : signe
          ? Int16Array.from(pixels)
          : Uint16Array.from(pixels);
    byteArray = new Uint8Array(vue.buffer.slice(0));
    element = { dataOffset: 0, length: byteArray.length };
  }

  return {
    uint16: (t: string) => (typeof tags[t] === 'number' ? (tags[t] as number) : undefined),
    intString: (t: string) => (typeof tags[t] === 'number' ? (tags[t] as number) : undefined),
    floatString: (t: string) => (typeof tags[t] === 'number' ? (tags[t] as number) : undefined),
    string: (t: string) => (typeof tags[t] === 'string' ? (tags[t] as string) : undefined),
    elements: { x7fe00010: element } as Record<
      string,
      { dataOffset: number; length: number } | undefined
    >,
    byteArray,
  };
}

const enTeteSain: Tags = {
  x00020010: '1.2.840.10008.1.2.1',
  x00280010: 4,
  x00280011: 4,
  x00280002: 1,
  x00280004: 'MONOCHROME2',
  x00280100: 16,
  x00280103: 0,
  x00281050: 2000,
  x00281051: 4000,
};

describe('reconnaissance d’un DICOM', () => {
  it('voit la marque DICM à l’octet 128', () => {
    const o = new Uint8Array(200);
    o.set([0x44, 0x49, 0x43, 0x4d], 128);
    expect(estDicom(o)).toBe(true);
  });

  it('accepte l’extension quand le préambule manque', () => {
    expect(estDicom(new Uint8Array(10), 'capteur.dcm')).toBe(true);
    expect(estDicom(new Uint8Array(10), 'CAPTEUR.DCM')).toBe(true);
  });

  it('refuse un fichier quelconque', () => {
    expect(estDicom(new Uint8Array(200), 'photo.png')).toBe(false);
  });
});

describe('refus explicites', () => {
  /*
   * Le point important : nommer ce qui bloque. Un refus « format non
   * supporté » laisse le praticien sans issue ; nommer « JPEG 2000 » lui
   * dit quoi changer dans son logiciel de capteur.
   */
  it('nomme la compression rencontrée', () => {
    for (const [uid, nom] of [
      ['1.2.840.10008.1.2.4.90', 'JPEG 2000'],
      ['1.2.840.10008.1.2.5', 'RLE'],
      ['1.2.840.10008.1.2.4.50', 'JPEG de base'],
      ['1.2.840.10008.1.2.2', 'gros-boutiste'],
    ] as const) {
      try {
        lireEnTete(jeu({ ...enTeteSain, x00020010: uid }));
        throw new Error('aurait dû refuser');
      } catch (e) {
        expect(e).toBeInstanceOf(DicomIllisible);
        expect((e as Error).message).toContain(nom);
      }
    }
  });

  it('refuse une syntaxe inconnue en la citant', () => {
    expect(() => lireEnTete(jeu({ ...enTeteSain, x00020010: '1.2.3.4.5' }))).toThrow(/1\.2\.3\.4\.5/);
  });

  it('refuse des dimensions absentes', () => {
    expect(() => lireEnTete(jeu({ ...enTeteSain, x00280010: 0 }))).toThrow(DicomIllisible);
  });

  it('refuse un nombre d’échantillons exotique', () => {
    expect(() => lireEnTete(jeu({ ...enTeteSain, x00280002: 4 }))).toThrow(/4 échantillons/);
  });

  it('refuse une profondeur de pixel non gérée', () => {
    const meta = lireEnTete(jeu({ ...enTeteSain, x00280100: 32 }));
    expect(() => lirePixels(jeu(enTeteSain, Int32Array.from([1])), meta)).toThrow(/32 bits/);
  });

  it('refuse un DICOM sans données d’image', () => {
    const meta = lireEnTete(jeu(enTeteSain));
    expect(() => lirePixels(jeu(enTeteSain), meta)).toThrow(/pas de données/);
  });
});

describe('en-tête', () => {
  it('lit les champs utiles', () => {
    const meta = lireEnTete(
      jeu({
        ...enTeteSain,
        x00280004: 'MONOCHROME1',
        x00280103: 1,
        x00281052: -1024,
        x00281053: 2,
        x00080060: 'IO',
        x00080020: '20260412',
        x00280008: 3,
      }),
    );
    expect(meta).toMatchObject({
      largeur: 4,
      hauteur: 4,
      bitsAlloues: 16,
      signe: true,
      monochromeInverse: true,
      centre: 2000,
      fenetre: 4000,
      ordonnee: -1024,
      pente: 2,
      modalite: 'IO',
      dateExamen: '20260412',
      nombreDeVues: 3,
    });
  });

  it('retient des valeurs par défaut raisonnables', () => {
    const meta = lireEnTete(jeu({ x00020010: '1.2.840.10008.1.2', x00280010: 2, x00280011: 2 }));
    expect(meta).toMatchObject({ bitsAlloues: 16, signe: false, pente: 1, ordonnee: 0, nombreDeVues: 1 });
    expect(meta.centre).toBeNull();
  });
});

describe('fenêtrage', () => {
  const base: MetaDicom = {
    largeur: 2,
    hauteur: 2,
    bitsAlloues: 16,
    signe: false,
    echantillonsParPixel: 1,
    monochromeInverse: false,
    centre: 2000,
    fenetre: 4000,
    pente: 1,
    ordonnee: 0,
    syntaxe: '1.2.840.10008.1.2.1',
    modalite: '',
    dateExamen: '',
    nombreDeVues: 1,
  };

  it('ramène la fenêtre déclarée sur 0 à 255', () => {
    const g = appliquerFenetre(Int32Array.from([0, 1000, 2000, 4000]), base);
    expect(g[0]).toBe(0);
    expect(g[3]).toBe(255);
    expect(g[1]).toBeGreaterThan(50);
    expect(g[1]).toBeLessThan(80);
    expect(g[2]).toBeGreaterThan(120);
    expect(g[2]).toBeLessThan(135);
  });

  it('inverse MONOCHROME1', () => {
    const droit = appliquerFenetre(Int32Array.from([0, 4000]), base);
    const inverse = appliquerFenetre(Int32Array.from([0, 4000]), { ...base, monochromeInverse: true });
    expect(droit[0]).toBe(0);
    expect(inverse[0]).toBe(255);
    expect(inverse[1]).toBe(0);
  });

  /*
   * Beaucoup de capteurs ne déclarent pas de fenêtre. Sans repli, tout
   * serait écrasé et l'image ressortirait plate.
   */
  it('déduit la fenêtre quand elle manque', () => {
    const sans = { ...base, centre: null, fenetre: null };
    const g = appliquerFenetre(Int32Array.from([500, 600, 700, 800]), sans);
    expect(g[0]).toBe(0);
    expect(g[3]).toBe(255);
    expect(g[1]).toBeGreaterThan(g[0]);
    expect(g[2]).toBeGreaterThan(g[1]);
  });

  it('survit à une image uniforme', () => {
    const sans = { ...base, centre: null, fenetre: null };
    const g = appliquerFenetre(Int32Array.from([300, 300, 300, 300]), sans);
    expect(g.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('applique pente et ordonnée avant le fenêtrage', () => {
    const avec = appliquerFenetre(Int32Array.from([0, 2000]), { ...base, pente: 2, ordonnee: 0 });
    const sans = appliquerFenetre(Int32Array.from([0, 2000]), base);
    expect(avec[1]).toBeGreaterThan(sans[1]);
  });
});

describe('composition RVBA', () => {
  const meta = (echantillons: number): MetaDicom => ({
    largeur: 2,
    hauteur: 1,
    bitsAlloues: 8,
    signe: false,
    echantillonsParPixel: echantillons,
    monochromeInverse: false,
    centre: 128,
    fenetre: 256,
    pente: 1,
    ordonnee: 0,
    syntaxe: '1.2.840.10008.1.2.1',
    modalite: '',
    dateExamen: '',
    nombreDeVues: 1,
  });

  it('étale le gris sur les trois canaux', () => {
    const r = composerImage(Uint8ClampedArray.from([10, 200]), meta(1));
    expect(Array.from(r)).toEqual([10, 10, 10, 255, 200, 200, 200, 255]);
  });

  it('recopie les canaux d’une image couleur', () => {
    const r = composerImage(Uint8ClampedArray.from([1, 2, 3, 4, 5, 6]), meta(3));
    expect(Array.from(r)).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
  });
});

describe('libellés', () => {
  it('met la date DICOM au format français', () => {
    expect(formaterDateDicom('20260412')).toBe('12/04/2026');
    expect(formaterDateDicom('')).toBe('');
    expect(formaterDateDicom('n’importe quoi')).toBe('');
  });

  it('compose un libellé avec la modalité et la date', () => {
    const meta = { modalite: 'IO', dateExamen: '20260412' } as MetaDicom;
    expect(libelleDicom('retro-16.dcm', meta)).toBe('retro-16 · IO · 12/04/2026');
  });

  it('se contente de ce qu’il a', () => {
    const meta = { modalite: '', dateExamen: '' } as MetaDicom;
    expect(libelleDicom('retro-16.dcm', meta)).toBe('retro-16');
    expect(libelleDicom('.dcm', meta)).toBe('Cliché DICOM');
  });
});

/* ------------------------------------------------------------------ *
 * Épreuve de bout en bout : un vrai fichier DICOM, écrit octet par
 * octet, relu par l'analyseur. Les tests ci-dessus valident notre
 * logique ; celui-ci valide que nous lisons les bons numéros de tag.
 * ------------------------------------------------------------------ */

function us(groupe: number, element: number, valeur: number): Uint8Array {
  const b = new Uint8Array(10);
  const v = new DataView(b.buffer);
  v.setUint16(0, groupe, true);
  v.setUint16(2, element, true);
  b.set([0x55, 0x53], 4); // VR « US »
  v.setUint16(6, 2, true);
  v.setUint16(8, valeur, true);
  return b;
}

function texte(groupe: number, element: number, vr: string, valeur: string): Uint8Array {
  const pad = valeur.length % 2 === 1 ? valeur + (vr === 'UI' ? '\0' : ' ') : valeur;
  const b = new Uint8Array(8 + pad.length);
  const v = new DataView(b.buffer);
  v.setUint16(0, groupe, true);
  v.setUint16(2, element, true);
  b.set([vr.charCodeAt(0), vr.charCodeAt(1)], 4);
  v.setUint16(6, pad.length, true);
  for (let i = 0; i < pad.length; i++) b[8 + i] = pad.charCodeAt(i);
  return b;
}

/** VR « OW » : forme longue, deux octets réservés puis une longueur sur 4. */
function pixels16(valeurs: number[]): Uint8Array {
  const corps = new Uint8Array(valeurs.length * 2);
  const cv = new DataView(corps.buffer);
  valeurs.forEach((x, i) => cv.setUint16(i * 2, x, true));

  const b = new Uint8Array(12 + corps.length);
  const v = new DataView(b.buffer);
  v.setUint16(0, 0x7fe0, true);
  v.setUint16(2, 0x0010, true);
  b.set([0x4f, 0x57], 4); // « OW »
  v.setUint16(6, 0, true); // réservé
  v.setUint32(8, corps.length, true);
  b.set(corps, 12);
  return b;
}

function assembler(morceaux: Uint8Array[]): Uint8Array {
  const total = morceaux.reduce((n, m) => n + m.length, 0);
  const sortie = new Uint8Array(total);
  let d = 0;
  for (const m of morceaux) {
    sortie.set(m, d);
    d += m.length;
  }
  return sortie;
}

function fabriquerDicom(valeurs: number[], largeur: number, hauteur: number): Uint8Array {
  const syntaxe = texte(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1');
  const longueurGroupe = new Uint8Array(12);
  const lg = new DataView(longueurGroupe.buffer);
  lg.setUint16(0, 0x0002, true);
  lg.setUint16(2, 0x0000, true);
  longueurGroupe.set([0x55, 0x4c], 4); // « UL »
  lg.setUint16(6, 4, true);
  lg.setUint32(8, syntaxe.length, true);

  const preambule = new Uint8Array(132);
  preambule.set([0x44, 0x49, 0x43, 0x4d], 128); // « DICM »

  return assembler([
    preambule,
    longueurGroupe,
    syntaxe,
    texte(0x0008, 0x0020, 'DA', '20260412'),
    texte(0x0008, 0x0060, 'CS', 'IO'),
    us(0x0028, 0x0002, 1),
    texte(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
    us(0x0028, 0x0010, hauteur),
    us(0x0028, 0x0011, largeur),
    us(0x0028, 0x0100, 16),
    us(0x0028, 0x0101, 16),
    us(0x0028, 0x0102, 15),
    us(0x0028, 0x0103, 0),
    texte(0x0028, 0x1050, 'DS', '2000'),
    texte(0x0028, 0x1051, 'DS', '4000'),
    pixels16(valeurs),
  ]);
}

describe('fichier DICOM réel', () => {
  const valeurs = [0, 1000, 2000, 3000, 4000, 500];
  const octets = fabriquerDicom(valeurs, 3, 2);

  it('porte la marque DICM', () => {
    expect(estDicom(octets, 'capteur.dcm')).toBe(true);
  });

  it('se lit de bout en bout avec les bons tags', async () => {
    const { default: analyseur } = await import('dicom-parser');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jeuReel = analyseur.parseDicom(octets) as any;

    const meta = lireEnTete(jeuReel);
    expect(meta).toMatchObject({
      largeur: 3,
      hauteur: 2,
      bitsAlloues: 16,
      signe: false,
      echantillonsParPixel: 1,
      monochromeInverse: false,
      centre: 2000,
      fenetre: 4000,
      modalite: 'IO',
      dateExamen: '20260412',
      syntaxe: '1.2.840.10008.1.2.1',
    });

    /* La preuve du décodage : les pixels relus doivent être ceux écrits. */
    expect(Array.from(lirePixels(jeuReel, meta))).toEqual(valeurs);

    const gris = appliquerFenetre(lirePixels(jeuReel, meta), meta);
    expect(gris[0]).toBe(0);
    expect(gris[4]).toBe(255);
    expect(gris.length).toBe(6);
  });
});
