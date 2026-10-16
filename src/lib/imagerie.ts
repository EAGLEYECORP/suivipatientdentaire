import { descellerBinaire, scellerBinaire, type BlocChiffre, type Coffre } from '@/lib/crypto';

/**
 * Stockage local des images cliniques.
 *
 * Les radios et photos ne tiennent pas dans localStorage : elles vivent dans
 * IndexedDB, à côté du dossier. Quand le cabinet a activé le coffre, chaque
 * binaire est chiffré avec la même clé que le reste du dossier — une radio
 * récupérée sur le disque sans la phrase secrète reste illisible.
 */

const BASE = 'suivi-patient-dentaire-images';
const MAGASIN = 'fichiers';
const VERSION = 1;

interface Enregistrement {
  id: string;
  mime: string;
  /** Présent uniquement lorsque le coffre est actif. */
  bloc?: BlocChiffre;
  donnees?: ArrayBuffer;
}

export function indexedDbDisponible(): boolean {
  return typeof indexedDB !== 'undefined';
}

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!indexedDbDisponible()) {
      reject(new Error('Le stockage d’images n’est pas disponible dans ce navigateur.'));
      return;
    }
    const requete = indexedDB.open(BASE, VERSION);
    requete.onupgradeneeded = () => {
      const db = requete.result;
      if (!db.objectStoreNames.contains(MAGASIN)) db.createObjectStore(MAGASIN, { keyPath: 'id' });
    };
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error ?? new Error('Ouverture du stockage impossible.'));
  });
}

function transaction<T>(mode: IDBTransactionMode, action: (magasin: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return ouvrir().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(MAGASIN, mode);
        const requete = action(tx.objectStore(MAGASIN));
        requete.onsuccess = () => resolve(requete.result);
        requete.onerror = () => reject(requete.error ?? new Error('Opération de stockage impossible.'));
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function enregistrerFichier(id: string, fichier: Blob, coffre: Coffre | null): Promise<void> {
  const donnees = await fichier.arrayBuffer();
  const enregistrement: Enregistrement = coffre
    ? { id, mime: fichier.type, bloc: await scellerBinaire(donnees, coffre) }
    : { id, mime: fichier.type, donnees };
  await transaction('readwrite', (m) => m.put(enregistrement));
}

export async function lireFichier(id: string, coffre: Coffre | null): Promise<Blob | null> {
  const e = (await transaction<Enregistrement | undefined>('readonly', (m) => m.get(id))) ?? null;
  if (!e) return null;
  if (e.bloc) {
    if (!coffre) throw new Error('Image chiffrée : déverrouillez le coffre pour l’afficher.');
    return new Blob([await descellerBinaire(e.bloc, coffre)], { type: e.mime });
  }
  return e.donnees ? new Blob([e.donnees], { type: e.mime }) : null;
}

export async function supprimerFichier(id: string): Promise<void> {
  await transaction('readwrite', (m) => m.delete(id));
}

export async function listerFichiers(): Promise<string[]> {
  const cles = await transaction<IDBValidKey[]>('readonly', (m) => m.getAllKeys());
  return cles.map(String);
}

/** Supprime les binaires qui n'ont plus de fiche correspondante. */
export async function purger(idsConserves: string[]): Promise<number> {
  const presents = await listerFichiers();
  const aSupprimer = presents.filter(
    (id) => !idsConserves.includes(id.replace(/-(vignette|original)$/, '')),
  );
  for (const id of aSupprimer) await supprimerFichier(id);
  return aSupprimer.length;
}

export interface DimensionsImage {
  largeur: number;
  hauteur: number;
}

/** Lit les dimensions d'une image sans la décoder entièrement en mémoire. */
export function mesurerImage(fichier: Blob): Promise<DimensionsImage> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      resolve({ largeur: img.naturalWidth, hauteur: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ largeur: 0, hauteur: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Produit une vignette compressée, pour que la galerie reste fluide. */
export function creerVignette(fichier: Blob, cote = 320): Promise<Blob> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const facteur = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * facteur));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * facteur));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(fichier);
        URL.revokeObjectURL(url);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => {
        resolve(b ?? fichier);
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.82);
    };
    img.onerror = () => {
      resolve(fichier);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export const ID_VIGNETTE = (id: string) => `${id}-vignette`;

/*
 * Un DICOM converti en PNG perd ses métadonnées. Le fichier d'origine est
 * donc conservé à côté : le praticien doit pouvoir le réexporter vers un
 * confrère ou un centre d'imagerie. Jeter la source serait une perte de
 * données décidée à sa place.
 */
export const ID_ORIGINAL = (id: string) => `${id}-original`;

/*
 * Tri et nommage des fichiers reçus.
 *
 * Les clichés arrivent par trois chemins : le sélecteur de fichiers, le
 * glisser-déposer et le collage depuis le presse-papiers. Les trois passent
 * par les fonctions ci-dessous, pour que le comportement soit le même quelle
 * que soit la porte d'entrée.
 */

export interface TriFichiers {
  images: File[];
  /** Fichiers à faire passer par le décodeur DICOM. */
  dicom: File[];
  refuses: string[];
}

/*
 * Les navigateurs ne donnent pas de type MIME aux .dcm : le tri se fait sur
 * l'extension et sur le type quand il est renseigné. La marque DICM, elle,
 * est vérifiée au décodage, là où l'on peut lire les octets.
 */
function ressembleADicom(fichier: File): boolean {
  return /\.dcm$/i.test(fichier.name.trim()) || fichier.type === 'application/dicom';
}

/** Répartit les fichiers reçus entre images, DICOM et refusés. */
export function trierFichiers(fichiers: Iterable<File>): TriFichiers {
  const images: File[] = [];
  const dicom: File[] = [];
  const refuses: string[] = [];
  for (const fichier of fichiers) {
    if (fichier.type.startsWith('image/')) images.push(fichier);
    else if (ressembleADicom(fichier)) dicom.push(fichier);
    else refuses.push(fichier.name || 'fichier sans nom');
  }
  return { images, dicom, refuses };
}

/**
 * Un seul message pour tout un lot.
 *
 * L'ancienne version écrasait l'erreur à chaque fichier écarté : en
 * déposant cinq documents, le praticien n'en voyait qu'un seul nommé.
 */
export function messageRefus(refuses: string[]): string {
  if (refuses.length === 0) return '';
  if (refuses.length === 1) return `« ${refuses[0]} » n’est pas une image et a été ignoré.`;
  return `${refuses.length} fichiers ignorés, ce ne sont pas des images : ${refuses.join(', ')}.`;
}

/* Noms que les navigateurs donnent à un presse-papiers sans fichier d'origine. */
const NOMS_GENERIQUES = /^(image|untitled|sans[\s-]?titre|capture)(\s*\(\d+\))?$/i;

/**
 * Libellé lisible pour un cliché.
 *
 * Un fichier collé s'appelle « image.png » dans la plupart des navigateurs :
 * dix collages donneraient dix vignettes nommées « image ». On leur substitue
 * un horodatage, qui les distingue et dit d'où ils viennent.
 */
export function libelleFichier(fichier: File, maintenant = new Date()): string {
  const sansExtension = fichier.name.replace(/\.[^.]+$/, '').trim();
  if (sansExtension && !NOMS_GENERIQUES.test(sansExtension)) return sansExtension;

  /*
   * Les secondes ne sont pas une coquetterie : un bitewing gauche puis droit
   * se collent à quelques secondes d'intervalle, et deux vignettes au même
   * libellé ne se distinguent plus dans la galerie.
   */
  const jour = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(maintenant);
  const heure = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(maintenant);
  return `Cliché collé le ${jour} à ${heure}`;
}

export interface EchecDicom {
  nom: string;
  raison: string;
}

/**
 * Un seul bloc pour tout ce qui a mal tourné.
 *
 * Les refus DICOM portent chacun leur raison, et elle est actionnable :
 * « compressé en JPEG 2000 » dit au praticien quoi changer dans son
 * logiciel de capteur, là où « format non supporté » le laisse sans issue.
 */
export function messageProblemes(refuses: string[], dicomEchoues: EchecDicom[]): string {
  const lignes: string[] = [];
  const refus = messageRefus(refuses);
  if (refus) lignes.push(refus);
  for (const e of dicomEchoues) lignes.push(`« ${e.nom} » : ${e.raison}`);
  return lignes.join('\n');
}

/** Récapitulatif après un import, pour que le praticien sache ce qui est entré. */
export function messageImport(nombre: number): string {
  if (nombre === 0) return '';
  return nombre === 1 ? '1 cliché importé.' : `${nombre} clichés importés.`;
}
