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

if (!rerouterAncienneAdresse() && !rerouterApplicationInstallee()) {
  adapterAuPosteConnu();
  daterLePied();
}
