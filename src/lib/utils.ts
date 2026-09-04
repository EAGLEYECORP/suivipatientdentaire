/** Small helpers shared across the app. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

let compteur = 0;
export function uid(prefixe = 'id'): string {
  compteur += 1;
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefixe}_${Date.now().toString(36)}${compteur.toString(36)}${rnd}`;
}

export function maintenant(): string {
  return new Date().toISOString();
}

export function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatMontant(valeur: number, devise = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: devise,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(valeur) ? valeur : 0);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function formatDateHeure(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatHeure(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d);
}

/** Age in whole years at the reference date. */
export function age(dateNaissance: string, reference = new Date()): number {
  const n = new Date(`${dateNaissance}T00:00:00`);
  if (Number.isNaN(n.getTime())) return 0;
  let a = reference.getFullYear() - n.getFullYear();
  const m = reference.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && reference.getDate() < n.getDate())) a -= 1;
  return Math.max(0, a);
}

export function initiales(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

/** Accent- and case-insensitive containment test used by every search field. */
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function correspond(source: string, requete: string): boolean {
  const q = normaliser(requete);
  if (!q) return true;
  return normaliser(source).includes(q);
}

export function ajouterMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

/** Start of the ISO week (Monday) for the given date, at 00:00 local time. */
export function debutSemaine(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const jour = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - jour);
  return d;
}

export function memeJour(a: Date | string, b: Date | string): boolean {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function isoLocal(date: Date): string {
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 16);
}

export function arrondi2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
