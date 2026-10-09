/*
 * Comportements de la vitrine publique.
 *
 * Deux rôles seulement :
 *   1. rediriger les accès qui visaient l'application, pas la vitrine ;
 *   2. signaler au praticien déjà installé qu'il peut reprendre son poste.
 *
 * L'apparition au défilement est entièrement en CSS : la page doit rester
 * lisible même si ce script ne se charge pas.
 */

const APPLICATION = './app.html';

/*
 * L'application vivait à la racine : les signets et les raccourcis installés
 * pointent vers `/#/patients`, `/#/agenda`, etc. Ces adresses arrivent
 * désormais sur la vitrine. Un fragment commençant par « #/ » est donc une
 * ancienne route applicative, et non une ancre de cette page.
 */
function rerouterAncienneAdresse(): boolean {
  const fragment = window.location.hash;
  if (!fragment.startsWith('#/')) return false;
  window.location.replace(`${APPLICATION}${fragment}`);
  return true;
}

/*
 * Un praticien qui a installé l'application lance une fenêtre autonome : il
 * ouvre son poste de travail, pas une page de présentation. Le manifeste
 * pointe maintenant sur app.html, mais les installations antérieures
 * démarrent encore sur la racine.
 */
function rerouterApplicationInstallee(): boolean {
  const autonome =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // Safari iOS n'implémente pas display-mode.
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (!autonome) return false;
  window.location.replace(APPLICATION);
  return true;
}

/*
 * Si ce poste porte déjà un dossier, « Ouvrir l'application » devient
 * « Reprendre le suivi » : le visiteur n'est pas un prospect, c'est le
 * praticien qui revient.
 */
function adapterAuPosteConnu(): void {
  let connu = false;
  try {
    connu = window.localStorage.getItem('suivi-patient-dentaire:v1') !== null;
  } catch {
    // Navigation privée ou stockage refusé : on garde le libellé d'accueil.
    return;
  }
  if (!connu) return;

  for (const element of document.querySelectorAll<HTMLElement>('[data-libelle-retour]')) {
    const retour = element.dataset.libelleRetour;
    if (retour) element.textContent = retour;
  }
}

/* L'année du pied de page, pour ne pas la laisser vieillir dans le HTML. */
function daterLePied(): void {
  const cible = document.querySelector('[data-annee]');
  if (cible) cible.textContent = String(new Date().getFullYear());
}

/*
 * Comparateur de coût sur cinq ans.
 *
 * Le visiteur fournit le montant de son abonnement : aucun prix de
 * concurrent n'est inscrit dans la page. Un tarif publié vieillit, et
 * afficher le chiffre d'un confrère revient à se porter garant d'une
 * information qu'on ne maîtrise pas.
 *
 * Notre côté est calculé au pire : licence plus maintenance facultative
 * prise chaque année. Le modèle doit nous desservir, pas nous flatter.
 */
const LICENCE = 5000;
const MAINTENANCE = 800;
const MOIS_COMPARES = 60;

/** Coût cumulé de notre offre après `mois`, première année de suivi comprise. */
function coutLicence(mois: number): number {
  const anneesPayantes = Math.max(0, Math.ceil((mois - 12) / 12));
  return LICENCE + MAINTENANCE * anneesPayantes;
}

/** Premier mois où l'abonnement dépasse la licence, ou null sur dix ans. */
function moisDeBascule(mensuel: number): number | null {
  if (mensuel <= 0) return null;
  for (let mois = 1; mois <= 120; mois++) {
    if (mensuel * mois >= coutLicence(mois)) return mois;
  }
  return null;
}

function enDirhams(montant: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(montant))} DH`;
}

/** « 33 mois » devient « 33 mois, soit 2 ans et 9 mois ». */
function enDuree(mois: number): string {
  const annees = Math.floor(mois / 12);
  const reste = mois % 12;
  if (annees === 0) return `${mois} mois`;
  const partAnnees = annees === 1 ? 'un an' : `${annees} ans`;
  if (reste === 0) return `${mois} mois, soit ${partAnnees}`;
  return `${mois} mois, soit ${partAnnees} et ${reste} mois`;
}

function brancherComparateur(): void {
  const entree = document.querySelector<HTMLInputElement>('#abonnement');
  if (!entree) return;

  const cible = (nom: string) => document.querySelector<HTMLElement>(`[data-calcul="${nom}"]`);
  const eux = cible('eux');
  const nous = cible('nous');
  const ecart = cible('ecart');
  const verdict = cible('verdict');
  if (!eux || !nous || !ecart || !verdict) return;

  const recalculer = () => {
    const saisi = Number.parseFloat(entree.value);
    const mensuel = Number.isFinite(saisi) && saisi > 0 ? saisi : 0;

    const coutEux = mensuel * MOIS_COMPARES;
    const coutNous = coutLicence(MOIS_COMPARES);

    eux.textContent = enDirhams(coutEux);
    nous.textContent = enDirhams(coutNous);

    const difference = coutEux - coutNous;

    if (mensuel === 0) {
      // Sans montant saisi, il n'y a pas de comparaison : afficher un écart
      // négatif reviendrait à répondre à une question qui n'est pas posée.
      ecart.textContent = 'Non calculé';
      verdict.textContent =
        'Entrez le montant de votre abonnement actuel pour voir au bout de combien de temps la licence est amortie.';
      return;
    }

    ecart.textContent = `${difference >= 0 ? '' : '-'}${enDirhams(Math.abs(difference))}`;

    const bascule = moisDeBascule(mensuel);
    if (bascule === null) {
      verdict.textContent =
        'À ce tarif, votre abonnement reste moins cher que notre licence. Mieux vaut le garder : nous vous le disons plutôt que de masquer le calcul.';
      return;
    }

    verdict.textContent =
      difference >= 0
        ? `La licence est amortie au bout de ${enDuree(bascule)}. Ensuite, elle ne vous coûte plus que la maintenance, si vous la prenez.`
        : `La licence serait amortie au bout de ${enDuree(bascule)}, donc au-delà des cinq ans comparés ici.`;
  };

  entree.addEventListener('input', recalculer);
  recalculer();
}

if (!rerouterAncienneAdresse() && !rerouterApplicationInstallee()) {
  adapterAuPosteConnu();
  daterLePied();
  brancherComparateur();
}
