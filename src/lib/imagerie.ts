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
  const aSupprimer = presents.filter((id) => !idsConserves.includes(id.replace(/-vignette$/, '')));
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
