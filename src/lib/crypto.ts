/**
 * Coffre local chiffré.
 *
 * Le dossier patient reste sur le poste, mais il n'y dort plus en clair :
 * la phrase secrète du cabinet dérive une clé AES-256-GCM (PBKDF2-SHA-256,
 * 310 000 itérations, sel aléatoire de 16 octets) qui chiffre l'intégralité
 * du magasin. La clé ne quitte jamais la mémoire du navigateur et n'est
 * jamais persistée : à la fermeture de l'onglet, le coffre se referme.
 */

export const ITERATIONS_PBKDF2 = 310_000;
const TAILLE_SEL = 16;
const TAILLE_IV = 12;

export interface EnveloppeChiffree {
  chiffre: true;
  version: 1;
  /** Sel PBKDF2, encodé en base64. */
  sel: string;
  iv: string;
  /** Texte chiffré encodé en base64. */
  charge: string;
  /** Horodatage du dernier scellement, lisible sans déchiffrer. */
  scelleLe: string;
}

function sousSysteme(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error(
      'Le chiffrement nécessite un contexte sécurisé (HTTPS ou localhost). Ouvrez l’application en HTTPS.',
    );
  }
  return c.subtle;
}

export function chiffrementDisponible(): boolean {
  return typeof globalThis.crypto?.subtle !== 'undefined';
}

export function versBase64(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire);
}

export function depuisBase64(texte: string): Uint8Array {
  const binaire = atob(texte);
  const out = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) out[i] = binaire.charCodeAt(i);
  return out;
}

async function deriver(phrase: string, sel: Uint8Array): Promise<CryptoKey> {
  const subtle = sousSysteme();
  const materiel = await subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: sel as BufferSource, iterations: ITERATIONS_PBKDF2, hash: 'SHA-256' },
    materiel,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface Coffre {
  cle: CryptoKey;
  sel: Uint8Array;
}

/** Crée un coffre neuf à partir d'une phrase secrète. */
export async function creerCoffre(phrase: string): Promise<Coffre> {
  const sel = globalThis.crypto.getRandomValues(new Uint8Array(TAILLE_SEL));
  return { cle: await deriver(phrase, sel), sel };
}

/** Rouvre un coffre existant ; le sel provient de l'enveloppe stockée. */
export async function ouvrirCoffre(phrase: string, selBase64: string): Promise<Coffre> {
  const sel = depuisBase64(selBase64);
  return { cle: await deriver(phrase, sel), sel };
}

export async function sceller(contenu: string, coffre: Coffre): Promise<EnveloppeChiffree> {
  const subtle = sousSysteme();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(TAILLE_IV));
  const chiffre = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    coffre.cle,
    new TextEncoder().encode(contenu),
  );
  return {
    chiffre: true,
    version: 1,
    sel: versBase64(coffre.sel),
    iv: versBase64(iv),
    charge: versBase64(new Uint8Array(chiffre)),
    scelleLe: new Date().toISOString(),
  };
}

/** Lève une erreur explicite si la phrase secrète est fausse. */
export async function desceller(enveloppe: EnveloppeChiffree, coffre: Coffre): Promise<string> {
  const subtle = sousSysteme();
  try {
    const clair = await subtle.decrypt(
      { name: 'AES-GCM', iv: depuisBase64(enveloppe.iv) as BufferSource },
      coffre.cle,
      depuisBase64(enveloppe.charge) as BufferSource,
    );
    return new TextDecoder().decode(clair);
  } catch {
    throw new Error('Phrase secrète incorrecte.');
  }
}

export function estEnveloppeChiffree(valeur: unknown): valeur is EnveloppeChiffree {
  return (
    typeof valeur === 'object' &&
    valeur !== null &&
    (valeur as { chiffre?: unknown }).chiffre === true &&
    typeof (valeur as { charge?: unknown }).charge === 'string'
  );
}

/** Évalue grossièrement la robustesse d'une phrase secrète, pour guider l'utilisateur. */
export function forcePhrase(phrase: string): { score: 0 | 1 | 2 | 3 | 4; libelle: string } {
  let score = 0;
  if (phrase.length >= 10) score += 1;
  if (phrase.length >= 16) score += 1;
  if (/[a-z]/.test(phrase) && /[A-Z]/.test(phrase)) score += 1;
  if (/\d/.test(phrase) && /[^\w\s]/.test(phrase)) score += 1;
  const libelles = ['Très faible', 'Faible', 'Correcte', 'Bonne', 'Excellente'];
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  return { score: s, libelle: libelles[s] };
}
